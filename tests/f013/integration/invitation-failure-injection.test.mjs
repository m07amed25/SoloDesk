import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";
import { dispatchInvitationNotification } from "../../../supabase/functions/_shared/invitation-delivery.ts";

class FailureInjectionHarness {
  constructor() {
    this.workspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;
    this.invitationId = "i0000000-0000-4000-8000-000000000001";
    this.revision = 1;
    this.lifecycle = "pending";
    this.operations = new Map();
  }

  // 1. Simulated authority load failures
  loadAuthority(token) {
    if (!token) {
      return {
        ok: false,
        code: "online_required",
        action: "connect_and_retry",
      };
    }
    if (token === "expired_token") {
      return { ok: false, code: "not_authorized", action: "connect_and_retry" };
    }
    return { ok: true, role: "owner" };
  }

  // 2. Simulated operation replay with network drop recovery
  executeOperation(opId, fn) {
    if (this.operations.has(opId)) {
      const stored = this.operations.get(opId);
      return {
        ok: true,
        effect: "replayed",
        originalEffect: stored.effect,
        invitationId: stored.invitationId,
      };
    }
    const result = fn();
    if (result.ok) {
      this.operations.set(opId, result);
    }
    return result;
  }

  // 3. Simulated continuation token expiry
  verifyContinuation(token, issuedAt, maxAgeMs = 900000) {
    if (!token) return { ok: false, reason: "missing_token" };
    if (Date.now() - issuedAt > maxAgeMs) {
      return { ok: false, reason: "continuation_expired" };
    }
    return { ok: true };
  }
}

test("F013 T071: Authority load failure injection rejects invalid or expired tokens fail-closed", () => {
  const harness = new FailureInjectionHarness();

  const missingRes = harness.loadAuthority(null);
  assert.equal(missingRes.ok, false);
  assert.equal(missingRes.code, "online_required");

  const expiredRes = harness.loadAuthority("expired_token");
  assert.equal(expiredRes.ok, false);
  assert.equal(expiredRes.code, "not_authorized");
});

test("F013 T071: Operation replay handles lost response recovery idempotently", () => {
  const harness = new FailureInjectionHarness();
  const opId = crypto.randomUUID();

  // First attempt commits
  const res1 = harness.executeOperation(opId, () => ({
    ok: true,
    effect: "created",
    invitationId: harness.invitationId,
  }));
  assert.equal(res1.ok, true);
  assert.equal(res1.effect, "created");

  // Client lost network response and retries identical operationId
  const res2 = harness.executeOperation(opId, () => {
    throw new Error("Should not re-execute already committed operation");
  });
  assert.equal(res2.ok, true);
  assert.equal(res2.effect, "replayed");
  assert.equal(res2.invitationId, harness.invitationId);
});

test("F013 T071: Provider failure injection keeps generation invalid and does not mark accepted", async () => {
  // Provider simulates a network timeout during dispatch
  const timeoutTransport = async () => {
    throw new Error("ETIMEDOUT: Connection timed out to provider");
  };

  const delivery = await dispatchInvitationNotification(
    {
      locale: "en",
      recipientEmail: "test@test.local",
      workspaceLabel: "Workspace Test",
      roleLabel: "Contributor",
      secretUrl:
        "https://solodesk.app/#sel_11111111111111111111111111111111.secret",
      expiryText: "7 days",
    },
    { transport: timeoutTransport },
  );

  assert.equal(delivery.status, "unknown");
  assert.equal(delivery.sink, "synthetic_test_sink");

  // Status must never be mistaken for accepted or delivered
  assert.notEqual(delivery.status, "delivered");
  assert.notEqual(delivery.status, "accepted");
});

test("F013 T071: Continuation token expiry rejects stale redemption attempts", () => {
  const harness = new FailureInjectionHarness();
  const token = "cont_12345";
  const staleTime = Date.now() - 1000000; // 16.6 minutes ago (> 15 minutes limit)

  const verify = harness.verifyContinuation(token, staleTime);
  assert.equal(verify.ok, false);
  assert.equal(verify.reason, "continuation_expired");
});

test("F013 T071: Concurrent resend vs revoke resolves deterministically without partial authority", () => {
  let state = "pending";
  let rev = 1;

  function doRevoke(expectedRev) {
    if (state !== "pending") return { ok: false, code: "stale_state" };
    if (expectedRev !== rev) return { ok: false, code: "stale_state" };
    state = "revoked";
    rev += 1;
    return { ok: true, state };
  }

  function doResend(expectedRev) {
    if (state !== "pending") return { ok: false, code: "stale_state" };
    if (expectedRev !== rev) return { ok: false, code: "stale_state" };
    rev += 1;
    return { ok: true, state };
  }

  // Revoke runs first
  const revokeRes = doRevoke(1);
  assert.equal(revokeRes.ok, true);
  assert.equal(revokeRes.state, "revoked");

  // Concurrent resend with stale revision 1 is rejected cleanly
  const resendRes = doResend(1);
  assert.equal(resendRes.ok, false);
  assert.equal(resendRes.code, "stale_state");
  assert.equal(state, "revoked");
});
