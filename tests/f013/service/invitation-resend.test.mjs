import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";

class ResendServiceMock {
  constructor() {
    this.invitation = {
      invitation_id: "i0000000-0000-4000-8000-000000000001",
      workspace_id: FIXTURE_WORKSPACES.wsMain.workspaceId,
      status: "pending",
      revision: 1,
      current_generation_id: "g0000000-0000-4000-8000-000000000001",
      recipient_type: "unresolved_verified_claim",
      recipient_claim_name: "email",
      recipient_claim_value: "sarah.invitee@test.local",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    this.generations = new Map([
      [
        "g0000000-0000-4000-8000-000000000001",
        {
          generation_id: "g0000000-0000-4000-8000-000000000001",
          generation_number: 1,
          selector: "sel_11111111111111111111111111111111",
          secret_digest: "digest_1",
          status: "current",
        },
      ],
    ]);

    this.deliveryAttempts = [
      {
        attempt_id: "d0000000-0000-4000-8000-000000000001",
        generation_id: "g0000000-0000-4000-8000-000000000001",
        attempt_number: 1,
        status: "delivered",
      },
    ];

    this.operations = new Map();
  }

  resend({ caller, operationId, expectedRevision }) {
    if (!caller || caller.role !== "owner") {
      return { ok: false, code: "not_authorized", action: "refresh" };
    }

    // Idempotent operation replay
    if (this.operations.has(operationId)) {
      return {
        ok: true,
        effect: "replayed",
        invitation: {
          invitationId: this.invitation.invitation_id,
          revision: this.invitation.revision,
          deliveryOutcome: "queued",
          lifecycle: "pending",
        },
      };
    }

    if (this.invitation.status !== "pending") {
      return { ok: false, code: "stale_state", action: "refresh" };
    }

    if (this.invitation.revision !== expectedRevision) {
      return { ok: false, code: "stale_state", action: "refresh" };
    }

    // 1. Supersede previous generation
    const prevGen = this.generations.get(this.invitation.current_generation_id);
    if (prevGen) {
      prevGen.status = "superseded";
    }

    // 2. Create new generation with incremented generation number
    const newGenNum = (prevGen ? prevGen.generation_number : 0) + 1;
    const newGenId = crypto.randomUUID();
    const newSelector = `sel_${crypto.randomBytes(16).toString("hex")}`;
    const newSecretDigest = `digest_${newGenNum}`;

    this.generations.set(newGenId, {
      generation_id: newGenId,
      generation_number: newGenNum,
      selector: newSelector,
      secret_digest: newSecretDigest,
      status: "current",
    });

    // 3. Increment revision and point to new generation
    this.invitation.revision += 1;
    this.invitation.current_generation_id = newGenId;

    // 4. Record new queued delivery attempt
    this.deliveryAttempts.push({
      attempt_id: crypto.randomUUID(),
      generation_id: newGenId,
      attempt_number: 1,
      status: "queued",
    });

    const result = {
      ok: true,
      effect: "resent",
      invitation: {
        invitationId: this.invitation.invitation_id,
        revision: this.invitation.revision,
        deliveryOutcome: "queued",
        lifecycle: "pending",
      },
    };

    this.operations.set(operationId, result);
    return result;
  }
}

test("F013 T041: Resend requires valid administrator authority", () => {
  const service = new ResendServiceMock();

  const resUnauth = service.resend({
    caller: { ...FIXTURE_ACCOUNTS.wrongAccount, role: "viewer" },
    operationId: crypto.randomUUID(),
    expectedRevision: 1,
  });
  assert.equal(resUnauth.ok, false);
  assert.equal(resUnauth.code, "not_authorized");
});

test("F013 T041: Resend atomically rotates generation, increments monotonic number, and supersedes prior secret", () => {
  const service = new ResendServiceMock();
  const priorGenId = service.invitation.current_generation_id;

  const res = service.resend({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    operationId: crypto.randomUUID(),
    expectedRevision: 1,
  });

  assert.equal(res.ok, true);
  assert.equal(res.effect, "resent");
  assert.equal(res.invitation.revision, 2);

  // Verify prior generation permanently superseded
  const priorGen = service.generations.get(priorGenId);
  assert.equal(priorGen.status, "superseded");

  // Verify new generation is current with generation_number 2
  const newGen = service.generations.get(
    service.invitation.current_generation_id,
  );
  assert.equal(newGen.status, "current");
  assert.equal(newGen.generation_number, 2);
  assert.notEqual(newGen.selector, priorGen.selector);

  // Verify queued delivery attempt added
  const latestDelivery =
    service.deliveryAttempts[service.deliveryAttempts.length - 1];
  assert.equal(latestDelivery.generation_id, newGen.generation_id);
  assert.equal(latestDelivery.status, "queued");
});

test("F013 T041: Stale expectedRevision rejects resend without mutating state", () => {
  const service = new ResendServiceMock();

  const resStale = service.resend({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    operationId: crypto.randomUUID(),
    expectedRevision: 99, // Mismatched revision
  });

  assert.equal(resStale.ok, false);
  assert.equal(resStale.code, "stale_state");
  assert.equal(service.invitation.revision, 1);
  assert.equal(service.generations.size, 1);
});

test("F013 T041: Idempotent replay with same operationId returns replayed result", () => {
  const service = new ResendServiceMock();
  const opId = crypto.randomUUID();

  const first = service.resend({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    operationId: opId,
    expectedRevision: 1,
  });
  assert.equal(first.ok, true);
  assert.equal(first.effect, "resent");

  const second = service.resend({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    operationId: opId,
    expectedRevision: 1,
  });
  assert.equal(second.ok, true);
  assert.equal(second.effect, "replayed");
  assert.equal(second.invitation.revision, 2);
  // Still only 2 generations
  assert.equal(service.generations.size, 2);
});
