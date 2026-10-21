import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { IdentityProfileRegistry } from "../../../app/main/identity/profile-registry.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { AuthAttemptManager } from "../../../app/main/identity/auth-attempts.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { ACCOUNT_A, ACCOUNT_B, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

test("T047/T049: account bindings are immutable, unique, and path-isolated", (t) => {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-isolation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const registry = new IdentityProfileRegistry(root);
  const a = registry.bind(ACCOUNT_A.issuer_id, ACCOUNT_A.subject_id);
  const b = registry.bind(ACCOUNT_B.issuer_id, ACCOUNT_B.subject_id);
  assert.notEqual(a.profileId, b.profileId);
  assert.notEqual(a.paths.directory, b.paths.directory);
  assert.equal(registry.bind(ACCOUNT_A.issuer_id, ACCOUNT_A.subject_id).profileId, a.profileId);
  assert.throws(() => registry.assertBinding(a.profileId, ACCOUNT_B.issuer_id, ACCOUNT_B.subject_id), /profile_binding_mismatch/);

  const aStore = new ProtectedIdentityStore(root, a.profileId, undefined, TEST_SECRET_PROTECTION);
  const bStore = new ProtectedIdentityStore(root, b.profileId, undefined, TEST_SECRET_PROTECTION);
  aStore.saveProfile({
    profile_id: a.profileId, issuer_id: a.issuerId, subject_id: a.subjectId,
    protection_binding_id: a.protectionBindingId, profile_generation: 1,
    compatibility_version: 1, lifecycle: "enrolled", last_transition_at: new Date().toISOString(),
  });
  aStore.saveEnrollmentIntent({
    enrollmentIntentId: "11111111-1111-4111-8111-111111111111", requestDigest: "a".repeat(64),
    profileReference: `profile:${a.profileId}`, profileGeneration: 1,
    installationContextId: "installation-a", deviceContextDigest: "b".repeat(64),
    deviceLabel: "Alice only", platform: "linux", architecture: "x64", appVersion: "0.0.0",
    protectionProofReference: "proof-a", payloadVersion: 1, status: "outcome_unknown",
  });
  const aAttempts = new AuthAttemptManager(parseIdentityConfig({ SOLODESK_TEST_MODE: "1" }), aStore);
  const aAttempt = aAttempts.createAttempt(a.profileId, 1, "desktop_custom_scheme_v1");
  assert.equal(bStore.loadProfile(), null);
  assert.equal(bStore.loadSessionBinding(), null);
  assert.equal(bStore.loadEnrollmentIntent(), null);
  assert.equal(bStore.loadActiveAttempt(), null);
  assert.equal(new AuthAttemptManager(parseIdentityConfig({ SOLODESK_TEST_MODE: "1" }), bStore)
    .findPendingAttemptByState(aAttempts.getAttemptProof(aAttempt.attempt_id).state, b.profileId, 1), null);
  assert.equal(readFileSync(a.paths.profile, "utf8").includes(ACCOUNT_B.subject_id), false);
  assert.equal(readFileSync(a.paths.enrollment, "utf8").includes("Alice only"), true);
});

test("T047/T049: corrupt registry bytes are preserved without empty replacement", (t) => {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-isolation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const registry = new IdentityProfileRegistry(root);
  registry.bind(ACCOUNT_A.issuer_id, ACCOUNT_A.subject_id);
  const path = join(root, "identities", "registry.v1.json");
  writeFileSync(path, "{corrupt");
  const before = readFileSync(path);
  assert.throws(() => registry.bind(ACCOUNT_B.issuer_id, ACCOUNT_B.subject_id), /corrupt_profile_registry/);
  assert.deepEqual(readFileSync(path), before);
});
