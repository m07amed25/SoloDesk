import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { IdentityCoordinator } from "../../../app/main/identity/coordinator.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { identityRecoveryState } from "../../../app/main/persistence/recovery-state.ts";
import { PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

const config = parseIdentityConfig({ SOLODESK_TEST_MODE: "1" });

function setup(t, protection) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-profile-recovery-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new ProtectedIdentityStore(root, PROFILE_A.profile_id, protection, TEST_SECRET_PROTECTION);
  return { root, store };
}

test("T039/T043: corrupt protected profile bytes stay unchanged and stop online authority", async (t) => {
  const { store } = setup(t);
  const bytes = Buffer.from("{corrupt protected profile bytes");
  const path = store.getPaths().profile;
  mkdirSync(store.getPaths().directory, { recursive: true });
  writeFileSync(path, bytes);
  let onlineCalls = 0;
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id,
    epoch: 1,
    config,
    store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
    restoreSession: async () => { onlineCalls += 1; return null; },
  });
  const state = await identity.restoreStartup();
  assert.equal(state.lifecycle, "recovery_required");
  assert.deepEqual(state.nextActions, ["contact_support"]);
  assert.deepEqual(readFileSync(path), bytes);
  assert.equal(onlineCalls, 0);
});

test("T039/T043: incompatible profile is preserved and requires upgrade", async (t) => {
  const { store } = setup(t);
  const path = store.getPaths().profile;
  const bytes = Buffer.from(JSON.stringify({ ...PROFILE_A, compatibility_version: 99 }));
  mkdirSync(store.getPaths().directory, { recursive: true });
  writeFileSync(path, bytes);
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id,
    epoch: 1,
    config,
    store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
  });
  const state = await identity.restoreStartup();
  assert.deepEqual(state.nextActions, ["upgrade"]);
  assert.deepEqual(readFileSync(path), bytes);
});

test("T039/T043/T045: recovery reasons expose only the deliberate safe action", () => {
  assert.deepEqual(identityRecoveryState(new Error("vault_locked")).nextActions, ["unlock_protection"]);
  assert.deepEqual(identityRecoveryState(new Error("session_rejected")).nextActions, ["sign_in_again"]);
  assert.deepEqual(identityRecoveryState(new Error("outcome_unknown")).nextActions, ["reconcile"]);
  assert.deepEqual(identityRecoveryState(new Error("unsupported_profile_format")).nextActions, ["upgrade"]);
  assert.deepEqual(identityRecoveryState(new Error("corrupt_profile")).nextActions, ["contact_support"]);
});

test("T039/T043: locked protection is explicit and does not create profile data", async (t) => {
  const { store } = setup(t, { assertKeyAvailable() { throw new Error("vault_locked"); } });
  const identity = new IdentityCoordinator({
    profileId: PROFILE_A.profile_id,
    epoch: 1,
    config,
    store,
    provider: { async exchangeCodeForTokens() { throw new Error("unused"); } },
  });
  const state = await identity.restoreStartup();
  assert.equal(state.lifecycle, "protection_unavailable");
  assert.deepEqual(state.nextActions, ["unlock_protection"]);
  assert.equal(existsSync(store.getPaths().profile), false);
  assert.equal(store.loadProfile(), null);
});
