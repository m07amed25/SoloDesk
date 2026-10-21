import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AuthAttemptManager } from "../../../app/main/identity/auth-attempts.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { EnrollmentCoordinator } from "../../../app/main/identity/enrollment.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { SessionOwner } from "../../../app/main/identity/session-owner.ts";
import { ACCOUNT_A, PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

const config = parseIdentityConfig({ SOLODESK_TEST_MODE: "1" });
const binding = {
  binding_id: "55555555-5555-4555-8555-555555555555", profile_id: PROFILE_A.profile_id,
  profile_generation: 1, issuer_id: ACCOUNT_A.issuer_id, subject_id: ACCOUNT_A.subject_id,
  credential_reference: "credential-a", session_generation: 1, status: "current",
  protected_write_status: "committed",
};

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-signout-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, store: new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, TEST_SECRET_PROTECTION) };
}

test("T046/T050: sign-out increments generation first and rejects an in-flight exchange", async (t) => {
  const { root, store } = setup(t);
  store.saveProfile({ ...PROFILE_A, retained_work_status: "present" });
  const retained = join(root, "retained-work.bin");
  writeFileSync(retained, "encrypted");
  let resolve;
  const owner = new SessionOwner(config, store, {
    async verifySession(tokens) { return tokens.id_token; },
    exchangeCodeForTokens: () => new Promise((done) => { resolve = done; }),
  });
  const exchange = owner.exchangeAndVerify({
    code: "code", verifier: "verifier", redirectUri: "solodesk://auth/callback",
    profileId: PROFILE_A.profile_id, profileGeneration: 1, expectedNonce: "nonce",
  });
  const result = owner.signOut();
  resolve({ access_token: "access", refresh_token: "refresh", id_token: {
    iss: config.issuer, sub: ACCOUNT_A.subject_id, aud: config.audience,
    exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000), nonce: "nonce",
  }});
  assert.equal((await exchange).success, false);
  assert.equal(result.profileGeneration, 2);
  assert.equal(result.retainedWork, "present");
  assert.equal(store.loadSessionBinding(), null);
  assert.equal(existsSync(store.getPaths().credentials), false);
  assert.equal(existsSync(retained), true);
});

test("T046/T050: cancelled callback and late enrollment cannot restore local authority", async (t) => {
  const { store } = setup(t);
  const attempts = new AuthAttemptManager(config, store);
  const attempt = attempts.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  const proof = attempts.getAttemptProof(attempt.attempt_id);
  attempts.cancelAttempt(attempt.attempt_id, PROFILE_A.profile_id, 1);
  assert.equal(attempts.consumeAttempt(attempt.attempt_id, proof.state, PROFILE_A.profile_id, 1).success, false);

  let current = true;
  let resolve;
  const enrollment = new EnrollmentCoordinator({
    store, account: ACCOUNT_A, profile: { ...PROFILE_A, lifecycle: "enrolling" }, sessionBinding: binding,
    installationContextId: "installation-a", platform: "linux", architecture: "x64",
    appVersion: "0.0.0", protectionProofReference: "proof-a", isCurrent: () => current,
    service: { enroll: () => new Promise((done) => { resolve = done; }), async result() { return null; } },
  });
  const pending = enrollment.confirm();
  current = false;
  resolve({ status: "enrolled", deviceEnrollmentId: "2", deviceId: "3", receiptId: "4" });
  assert.equal((await pending).status, "recovery_required");
  assert.equal(store.loadProfile(), null);
  assert.equal(store.loadEnrollmentIntent()?.status, "submitted");
});
