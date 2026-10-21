import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { IdentityCoordinator } from "../../../app/main/identity/coordinator.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { ACCOUNT_A, ACCOUNT_B, PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

const config = parseIdentityConfig({ SOLODESK_TEST_MODE: "1" });

test("T048: retained profile reopens only for its matching validated account", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-return-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, TEST_SECRET_PROTECTION);
  store.saveProfile(PROFILE_A);
  store.saveSessionBinding({
    binding_id: "55555555-5555-4555-8555-555555555555", profile_id: PROFILE_A.profile_id,
    profile_generation: 1, issuer_id: ACCOUNT_A.issuer_id, subject_id: ACCOUNT_A.subject_id,
    credential_reference: "credential-a", session_generation: 1, status: "current",
    protected_write_status: "committed",
  });
  store.saveEnrollmentIntent({
    enrollmentIntentId: "11111111-1111-4111-8111-111111111111", requestDigest: "a".repeat(64),
    profileReference: `profile:${PROFILE_A.profile_id}`, profileGeneration: 1,
    installationContextId: "installation-a", deviceContextDigest: "b".repeat(64), platform: "linux",
    architecture: "x64", appVersion: "0.0.0", protectionProofReference: "proof-a",
    payloadVersion: 1, status: "locally_committed",
  });
  const make = (account) => new IdentityCoordinator({
    profileId: PROFILE_A.profile_id, epoch: 1, config, store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
    restoreSession: async () => ({ ...account, verification_status: "verified", session_status: "current", verified_at: new Date().toISOString() }),
  });
  assert.equal((await make(ACCOUNT_B).restoreStartup()).lifecycle, "sign_in_required");
  assert.equal((await make(ACCOUNT_A).restoreStartup()).lifecycle, "enrolled");
});

test("T048: unusable protection leaves the retained profile unchanged", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-return-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new ProtectedIdentityStore(root, PROFILE_A.profile_id, {
    assertKeyAvailable() { throw new Error("vault_locked"); },
  }, TEST_SECRET_PROTECTION);
  store.saveProfile({ ...PROFILE_A, retained_work_status: "present" });
  const before = JSON.stringify(store.loadProfile());
  let onlineCalls = 0;
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id, epoch: 1, config, store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
    restoreSession: async () => { onlineCalls += 1; return null; },
  });
  const state = await identity.restoreStartup();
  assert.equal(state.lifecycle, "protection_unavailable");
  assert.equal(JSON.stringify(store.loadProfile()), before);
  assert.equal(onlineCalls, 0);
});

test("T048: sign-out reports retained work without describing deletion", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-return-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, TEST_SECRET_PROTECTION);
  store.saveProfile({ ...PROFILE_A, retained_work_status: "present" });
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id, epoch: 1, config, store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
  });
  const state = await identity.signOut();
  assert.equal(state.retainedWork, "present");
  assert.equal(state.messageKey, "shell.identity.signedOutRetainedWork");
  assert.doesNotMatch(state.messageKey, /delete/i);
});
