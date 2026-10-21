import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AuthAttemptManager } from "../../../app/main/identity/auth-attempts.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { IdentityCoordinator } from "../../../app/main/identity/coordinator.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { ACCOUNT_A, PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

const config = parseIdentityConfig({ SOLODESK_TEST_MODE: "1" });

function temporaryStore(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-restart-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, store: new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, TEST_SECRET_PROTECTION) };
}

test("T037/T040: only a complete custom-scheme attempt survives restart", (t) => {
  const { store } = temporaryStore(t);
  const first = new AuthAttemptManager(config, store);
  const created = first.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  const proof = first.getAttemptProof(created.attempt_id);

  const restored = new AuthAttemptManager(config, store).restoreAttempt(
    PROFILE_A.profile_id,
    1,
    "desktop_custom_scheme_v1",
  );
  assert.equal(restored?.attempt_id, created.attempt_id);
  assert.deepEqual(
    new AuthAttemptManager(config, store).restoreAttempt(PROFILE_A.profile_id, 2, "desktop_custom_scheme_v1"),
    null,
  );
  assert.equal(store.loadActiveAttempt()?.status, "cancelled");
  assert.equal(proof?.state.length > 0, true);
});

test("T037/T040: cancellation, expiry, missing proof, and loopback close fail closed", (t) => {
  const { store } = temporaryStore(t);
  const manager = new AuthAttemptManager(config, store);
  const cancelled = manager.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  assert.equal(manager.cancelAttempt(cancelled.attempt_id, PROFILE_A.profile_id, 1), true);
  assert.equal(store.loadActiveAttempt(), null);

  const expiring = manager.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  store.saveActiveAttempt({ ...store.loadActiveAttempt(), expires_at: new Date(0).toISOString() });
  assert.equal(new AuthAttemptManager(config, store).restoreAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1"), null);
  assert.equal(store.loadActiveAttempt()?.status, "expired");

  manager.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  store.saveActiveAttempt({ ...store.loadActiveAttempt(), raw_proof: undefined });
  assert.equal(new AuthAttemptManager(config, store).restoreAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1"), null);
  assert.equal(store.loadActiveAttempt()?.status, "cancelled");

  manager.createAttempt(PROFILE_A.profile_id, 1, "desktop_loopback_v1");
  assert.equal(new AuthAttemptManager(config, store).restoreAttempt(PROFILE_A.profile_id, 1, "desktop_loopback_v1"), null);
  assert.equal(store.loadActiveAttempt()?.status, "cancelled");
  assert.ok(expiring.attempt_id);
});

test("T037/T044: rejected online restoration never creates an empty workspace", async (t) => {
  const { root, store } = temporaryStore(t);
  store.saveProfile(PROFILE_A);
  store.saveSessionBinding({
    binding_id: "55555555-5555-4555-8555-555555555555",
    profile_id: PROFILE_A.profile_id,
    profile_generation: 1,
    issuer_id: ACCOUNT_A.issuer_id,
    subject_id: ACCOUNT_A.subject_id,
    credential_reference: "credential-a",
    session_generation: 1,
    status: "current",
    protected_write_status: "committed",
  });
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id,
    epoch: 1,
    config,
    store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
    restoreSession: async () => null,
  });
  const state = await identity.restoreStartup();
  assert.equal(state.lifecycle, "sign_in_required");
  assert.deepEqual(state.nextActions, ["sign_in_again"]);
  assert.equal(existsSync(join(root, "workspaces")), false);

  const secondInstanceReturn = await identity.handleIdentityReturn({
    kind: "identity_return",
    state: "untrusted",
    code: "untrusted",
    rawUrl: "solodesk://auth/callback?state=untrusted&code=untrusted",
  });
  assert.equal(secondInstanceReturn.lifecycle, "sign_in_required");
});

test("T037/T044: matching validated session resumes the original enrollment only", async (t) => {
  const { root, store } = temporaryStore(t);
  const profile = { ...PROFILE_A, lifecycle: "enrolling" };
  const binding = {
    binding_id: "55555555-5555-4555-8555-555555555555",
    profile_id: PROFILE_A.profile_id,
    profile_generation: 1,
    issuer_id: ACCOUNT_A.issuer_id,
    subject_id: ACCOUNT_A.subject_id,
    credential_reference: "credential-a",
    session_generation: 1,
    status: "current",
    protected_write_status: "committed",
  };
  store.saveProfile(profile);
  store.saveSessionBinding(binding);
  store.saveEnrollmentIntent({
    enrollmentIntentId: "11111111-1111-4111-8111-111111111111",
    requestDigest: "a".repeat(64),
    profileReference: `profile:${PROFILE_A.profile_id}`,
    profileGeneration: 1,
    installationContextId: "installation-a",
    deviceContextDigest: "b".repeat(64),
    platform: "linux",
    architecture: "x64",
    appVersion: "0.0.0",
    protectionProofReference: "proof-a",
    payloadVersion: 1,
    status: "outcome_unknown",
  });
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id,
    epoch: 1,
    config,
    store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
    restoreSession: async () => ({
      ...ACCOUNT_A,
      verification_status: "verified",
      session_status: "current",
      verified_at: new Date().toISOString(),
      diagnostic_id: "diagnostic-a",
    }),
    enrollment: {
      installationContextId: "installation-a",
      protectionProofReference: "proof-a",
      appVersion: "0.0.0",
      service: {
        async enroll() { throw new Error("must_reconcile_original"); },
        async result() {
          return {
            status: "enrolled",
            deviceEnrollmentId: "22222222-2222-4222-8222-222222222222",
            deviceId: "33333333-3333-4333-8333-333333333333",
            receiptId: "44444444-4444-4444-8444-444444444444",
          };
        },
      },
    },
  });
  const state = await identity.restoreStartup();
  assert.equal(state.lifecycle, "enrolled");
  assert.equal(store.loadEnrollmentIntent()?.enrollmentIntentId, "11111111-1111-4111-8111-111111111111");
  assert.equal(existsSync(join(root, "workspaces")), false);
});
