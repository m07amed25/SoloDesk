import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { SupabaseProviderAdapter } from "../../../app/main/identity/provider-adapter.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { SessionOwner } from "../../../app/main/identity/session-owner.ts";
import { AuthAttemptManager } from "../../../app/main/identity/auth-attempts.ts";
import { IdentityCoordinator } from "../../../app/main/identity/coordinator.ts";
import { EnrollmentCoordinator } from "../../../app/main/identity/enrollment.ts";
import { SupabaseEnrollmentService } from "../../../app/main/identity/enrollment-service.ts";
import { parseIdentityReturn } from "../../../app/main/links.ts";
import { ACCOUNT_A, ACCOUNT_B, PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

const config = parseIdentityConfig({ SOLODESK_TEST_MODE: "1" });
const binding = {
  binding_id: crypto.randomUUID(), profile_id: PROFILE_A.profile_id, profile_generation: 1,
  issuer_id: ACCOUNT_A.issuer_id, subject_id: ACCOUNT_A.subject_id,
  credential_reference: "credential-a", session_generation: 1, status: "current", protected_write_status: "committed",
};
const enrolled = { status: "enrolled", deviceEnrollmentId: crypto.randomUUID(), deviceId: crypto.randomUUID(), receiptId: crypto.randomUUID() };
const request = {
  code: "synthetic-code", verifier: "synthetic-verifier", redirectUri: "solodesk://auth/callback",
  profileId: PROFILE_A.profile_id, profileGeneration: 1, expectedNonce: "synthetic-nonce",
};
const validIdentity = (account = ACCOUNT_A) => ({ iss: account.issuer_id, sub: account.subject_id, aud: config.audience,
  iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 });
function setup(t, protection = TEST_SECRET_PROTECTION) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-regression-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, store: new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, protection) };
}
function mockProvider(account = ACCOUNT_A) {
  return {
    async exchangeCodeForTokens() { return { access_token: "synthetic-access", refresh_token: "synthetic-refresh" }; },
    async verifySession() { return validIdentity(account); },
  };
}
async function sessionFixture() {
  const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", keys.publicKey), kid: "fixture-key", alg: "ES256" };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const sign = async (overrides = {}) => {
    const input = `${encode({ alg: "ES256", kid: jwk.kid })}.${encode({ ...validIdentity(), ...overrides })}`;
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, Buffer.from(input));
    return `${input}.${Buffer.from(signature).toString("base64url")}`;
  };
  return { jwk, sign, encode };
}

test("review 1/9: actual Supabase adapter verifies signatures and accepts the standard PKCE response", async (t) => {
  const { store } = setup(t);
  const { jwk, sign, encode } = await sessionFixture();
  let access = await sign();
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    if (String(url).includes("jwks")) return Response.json({ keys: [jwk] });
    if (String(url).endsWith("/user")) return Response.json({ id: ACCOUNT_A.subject_id, email: "alice@example.com" });
    return Response.json({ access_token: access, refresh_token: "synthetic-refresh", user: { id: ACCOUNT_A.subject_id } });
  };
  const provider = new SupabaseProviderAdapter(config);
  assert.equal((await new SessionOwner(config, store, provider).exchangeAndVerify(request)).success, true);
  access = `${encode({ alg: "none" })}.${encode(validIdentity())}.`;
  assert.equal((await new SessionOwner(config, store, provider).exchangeAndVerify(request)).success, false);
  for (const claims of [{ exp: 0 }, { iat: 9999999999 }, { sub: "wrong-user" }, { iss: "https://foreign.test" }, { aud: "foreign" }]) {
    access = await sign(claims);
    assert.equal((await new SessionOwner(config, store, provider).exchangeAndVerify(request)).success, false);
  }
});

test("review 2/3: proof stays encrypted and recreated owners can restore protected credentials", async (t) => {
  const { store, root } = setup(t);
  const attempts = new AuthAttemptManager(config, store);
  const attempt = attempts.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  const proof = attempts.getAttemptProof(attempt.attempt_id);
  const bytes = readFileSync(store.getPaths().attempt, "utf8");
  for (const secret of Object.values(proof)) assert.equal(bytes.includes(secret), false);
  const provider = mockProvider();
  const first = await new SessionOwner(config, store, provider).exchangeAndVerify(request);
  const reopened = new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, TEST_SECRET_PROTECTION);
  const owner = new SessionOwner(config, reopened, provider);
  assert.equal((await owner.restore(first.sessionBinding, () => true))?.subject_id, ACCOUNT_A.subject_id);
  assert.equal(owner.getAccessToken(), "synthetic-access");

  const denied = new ProtectedIdentityStore(root, "denied", undefined, {
    ...TEST_SECRET_PROTECTION, assertAvailable() { throw new Error("vault_locked"); },
  });
  assert.throws(() => new AuthAttemptManager(config, denied).createAttempt("denied", 1), /vault_locked/);
  assert.equal((await new SessionOwner(config, denied, provider).exchangeAndVerify({ ...request, profileId: "denied" })).success, false);
});

test("review 5/6: foreign callbacks have no effect and wrong accounts cannot overwrite a session", async (t) => {
  const { store } = setup(t);
  store.saveProfile(PROFILE_A);
  store.saveEncryptedCredentials({ accessToken: "existing-a", refreshToken: "refresh-a" });
  store.saveSessionBinding(binding);
  const before = readFileSync(store.getPaths().credentials);
  const attempts = new AuthAttemptManager(config, store);
  const attempt = attempts.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  const proof = attempts.getAttemptProof(attempt.attempt_id);
  const identity = new IdentityCoordinator({ profileId: PROFILE_A.profile_id, epoch: 1, config, store, provider: mockProvider(ACCOUNT_B) });
  await identity.restoreStartup();
  const url = `solodesk://auth/callback?code=synthetic&state=${proof.state}`;
  assert.equal(parseIdentityReturn(`${url}&iss=https://foreign.test`, config), null);
  await identity.handleIdentityReturn({ kind: "identity_return", rawUrl: `${url}&iss=https://foreign.test`, state: proof.state, code: "synthetic" });
  assert.equal(identity.getState().lifecycle, "signing_in");
  await identity.handleIdentityReturn({ kind: "identity_return", rawUrl: "solodesk://auth/callback?error=access_denied&state=foreign", state: "foreign", error: "access_denied" });
  assert.equal(identity.getState().lifecycle, "signing_in");
  await identity.handleIdentityReturn(parseIdentityReturn(url, config));
  assert.deepEqual(readFileSync(store.getPaths().credentials), before);
  assert.equal(store.loadSessionBinding().subject_id, ACCOUNT_A.subject_id);
});

test("review 7: late startup validation cannot reverse sign-out", async (t) => {
  const { store } = setup(t);
  store.saveProfile(PROFILE_A); store.saveSessionBinding(binding);
  let resolve;
  const identity = new IdentityCoordinator({ profileId: PROFILE_A.profile_id, epoch: 1, config, store,
    provider: mockProvider(), restoreSession: () => new Promise((done) => { resolve = done; }) });
  const pending = identity.restoreStartup();
  await identity.signOut();
  resolve({ ...ACCOUNT_A, verification_status: "verified", session_status: "current", verified_at: new Date().toISOString() });
  await pending;
  assert.equal(identity.getState().lifecycle, "sign_in_required");
  assert.equal(identity.getState().sessionStatus, "none");
  assert.equal(store.loadSessionBinding(), null);
});

test("review 7: cancellation during exchange and sign-out during enrollment discard late results", async (t) => {
  const { store } = setup(t);
  const attempts = new AuthAttemptManager(config, store);
  const attempt = attempts.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  const proof = attempts.getAttemptProof(attempt.attempt_id);
  let releaseTokens;
  const identity = new IdentityCoordinator({ profileId: PROFILE_A.profile_id, epoch: 1, config, store,
    provider: { ...mockProvider(), exchangeCodeForTokens: () => new Promise((done) => { releaseTokens = done; }) } });
  await identity.restoreStartup();
  const pending = identity.handleIdentityReturn(parseIdentityReturn(`solodesk://auth/callback?code=synthetic&state=${proof.state}`, config));
  await identity.cancelSignIn();
  releaseTokens({ access_token: "late-token" }); await pending;
  assert.equal(identity.getState().lifecycle, "sign_in_required");
  assert.equal(store.loadProfile(), null);
  assert.equal(store.loadSessionBinding(), null);

  const secondAttempt = attempts.createAttempt(PROFILE_A.profile_id, 1, "desktop_custom_scheme_v1");
  const secondProof = attempts.getAttemptProof(secondAttempt.attempt_id);
  let releaseEnrollment;
  const second = new IdentityCoordinator({ profileId: PROFILE_A.profile_id, epoch: 1, config, store, provider: mockProvider(),
    enrollment: { installationContextId: "install-a", protectionProofReference: "proof-a", appVersion: "0.0.0", service: {
      enroll: () => new Promise((done) => { releaseEnrollment = done; }), async result() { return null; },
    } } });
  await second.restoreStartup();
  await second.handleIdentityReturn(parseIdentityReturn(`solodesk://auth/callback?code=synthetic&state=${secondProof.state}`, config));
  const enrolling = second.confirmEnrollment("Old account label");
  await second.signOut();
  releaseEnrollment(enrolled); await enrolling;
  assert.equal(second.getState().lifecycle, "sign_in_required");
  assert.equal(second.getState().safeDeviceLabel, undefined);
  assert.equal(store.loadProfile().lifecycle, "sign_in_required");
  assert.equal(store.loadSessionBinding(), null);
});

test("review 8: concurrent confirmation and reconciliation share one operation", async (t) => {
  const { store } = setup(t);
  let calls = 0, resolve;
  const coordinator = new EnrollmentCoordinator({ store, account: ACCOUNT_A, profile: PROFILE_A,
    sessionBinding: binding, installationContextId: "install-a", platform: "linux", architecture: "x64",
    appVersion: "0.0.0", protectionProofReference: "proof-a", service: {
      enroll() { calls++; return new Promise((done) => { resolve = done; }); },
      async result() { throw new Error("must_join_pending_operation"); },
    } });
  const first = coordinator.confirm("Workstation"), second = coordinator.confirm("Workstation"), lookup = coordinator.reconcile();
  assert.equal(calls, 1);
  resolve(enrolled);
  assert.deepEqual(await Promise.all([first, second, lookup]), Array(3).fill({ status: "enrolled", deviceLabel: "Workstation" }));
  assert.equal(store.loadEnrollmentIntent().status, "locally_committed");
});

test("review 4/10: real loopback delivery reaches verified enrollment through the runtime adapters", async (t) => {
  const { store } = setup(t);
  const { jwk, sign } = await sessionFixture();
  const token = await sign();
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let opened, identity, rpcCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (new URL(String(url)).hostname === "127.0.0.1") return originalFetch(url, options);
    if (String(url).includes("jwks")) return Response.json({ keys: [jwk] });
    if (String(url).endsWith("/user")) return Response.json({ id: ACCOUNT_A.subject_id });
    if (String(url).includes("/rpc/")) {
      rpcCalls++;
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      const payload = JSON.parse(options.body);
      assert.equal(payload.p_request.status, undefined);
      return Response.json(enrolled);
    }
    return Response.json({ access_token: token, refresh_token: "refresh-a", user: { id: ACCOUNT_A.subject_id } });
  };
  identity = new IdentityCoordinator({ profileId: PROFILE_A.profile_id, epoch: 1, config, store,
    provider: new SupabaseProviderAdapter(config), openBrowser: async (url) => { opened = new URL(url); return true; },
    enrollment: { service: new SupabaseEnrollmentService(config, () => identity.getAccessToken()),
      installationContextId: "install-a", protectionProofReference: "proof-a", appVersion: "0.0.0" } });
  t.after(() => identity.dispose());
  await identity.startSignIn();
  const callback = new URL(opened.searchParams.get("redirect_uri"));
  callback.searchParams.set("code", "synthetic"); callback.searchParams.set("state", opened.searchParams.get("state"));
  const reply = await fetch(callback); await reply.text();
  assert.equal(reply.status, 200);
  assert.equal(identity.getState().lifecycle, "enrolling");
  assert.equal((await identity.confirmEnrollment("Workstation")).lifecycle, "enrolled");
  assert.equal(rpcCalls, 1);
  await identity.signOut();
  assert.equal(identity.getState().safeDeviceLabel, undefined);
});
