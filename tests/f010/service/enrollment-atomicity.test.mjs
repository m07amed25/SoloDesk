import assert from "node:assert/strict";
import test from "node:test";
import { EnrollmentEmulator } from "../../../tooling/f010/enrollment-emulator.mjs";
import { validateIdentityAccount } from "../../../supabase/functions/_shared/identity-auth.ts";
import { handleCommandGateway } from "../../../supabase/functions/command-gateway/index.ts";

const account = { issuerId: "https://auth.solodesk.test", subjectId: "usr_a" };
const request = {
  enrollmentIntentId: "11111111-1111-4111-8111-111111111111",
  requestDigest: "a".repeat(64),
  profileReference: "profile-a",
  profileGeneration: 1,
  installationContextId: "install-a",
  deviceContextDigest: "b".repeat(64),
  deviceLabel: "Workstation",
  platform: "linux",
  architecture: "x64",
  appVersion: "0.0.0",
  protectionProofReference: "proof-a",
  payloadVersion: 1,
};

test("T026: identical and concurrent retries converge on one enrollment", async () => {
  const service = new EnrollmentEmulator();
  const [first, second] = await Promise.all([
    service.enroll(account, request),
    service.enroll(account, request),
  ]);
  assert.equal(first.deviceEnrollmentId, second.deviceEnrollmentId);
  assert.deepEqual(service.counts(), { intents: 1, enrollments: 1, receipts: 1, evidence: 1 });
});

test("T026: changed reuse, foreign account, and failpoints have no partial effect", async () => {
  const service = new EnrollmentEmulator();
  await service.enroll(account, request);
  await assert.rejects(
    service.enroll(account, { ...request, requestDigest: "c".repeat(64) }),
    /changed_intent/,
  );
  assert.equal(await service.result({ issuerId: "x", subjectId: "y" }, request.enrollmentIntentId), null);

  for (const failAt of ["intent", "enrollment", "receipt", "evidence"]) {
    const failed = new EnrollmentEmulator({ failAt });
    await assert.rejects(failed.enroll(account, request), /synthetic_failure/);
    assert.deepEqual(failed.counts(), { intents: 0, enrollments: 0, receipts: 0, evidence: 0 });
  }
});

test("T032-T033: gateway derives account from a cryptographically verified session", async () => {
  const keys = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  publicJwk.kid = "test-key";
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ iss: account.issuerId, sub: account.subjectId, aud: "solodesk-desktop", iat: now, exp: now + 300 });
  const signingInput = `${header}.${payload}`;
  const signature = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, Buffer.from(signingInput))).toString("base64url");
  const token = `${signingInput}.${signature}`;
  const authenticateIdentity = (req) => validateIdentityAccount(req, {
    issuer: account.issuerId,
    audience: "solodesk-desktop",
    fetchJwks: async () => new Response(JSON.stringify({ keys: [publicJwk] })),
  });
  let derived;
  const enrollmentDb = {
    async enroll(identity) { derived = identity; return { status: "enrolled" }; },
    async result() { return null; },
  };
  const gatewayPayload = { ...request };
  const digestInput = Object.fromEntries(
    Object.entries(gatewayPayload)
      .filter(([key]) => key !== "enrollmentIntentId" && key !== "requestDigest")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  gatewayPayload.requestDigest = Buffer.from(
    await crypto.subtle.digest("SHA-256", Buffer.from(JSON.stringify(digestInput))),
  ).toString("hex");
  const response = await handleCommandGateway(
    new Request("https://service.test/command", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ command: "device.enroll", payload: gatewayPayload }),
    }),
    async () => null,
    undefined,
    { authenticateIdentity, enrollmentDb },
  );
  assert.equal(response.status, 200);
  assert.equal(derived.subjectId, account.subjectId);

  const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  const rejected = await authenticateIdentity(new Request("https://service.test", {
    headers: { Authorization: `Bearer ${signingInput}.${tamperedSignature}` },
  }));
  assert.equal(rejected, null);
});

test("T032: Supabase ES256 tokens retain the full auth issuer path", async () => {
  const issuer = "https://project.supabase.co/auth/v1";
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  publicJwk.kid = "supabase-ec-key";
  publicJwk.alg = "ES256";
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", kid: publicJwk.kid, typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ iss: issuer, sub: "usr_ec", aud: "authenticated", iat: now, exp: now + 300 });
  const signingInput = `${header}.${payload}`;
  const signature = Buffer.from(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keys.privateKey,
    Buffer.from(signingInput),
  )).toString("base64url");
  const result = await validateIdentityAccount(
    new Request("https://service.test", {
      headers: { Authorization: `Bearer ${signingInput}.${signature}` },
    }),
    {
      issuer,
      audience: "authenticated",
      fetchJwks: async (url) => {
        assert.equal(url, `${issuer}/.well-known/jwks.json`);
        return new Response(JSON.stringify({ keys: [publicJwk] }));
      },
    },
  );
  assert.equal(result?.issuerId, issuer);
  assert.equal(result?.subjectId, "usr_ec");
});

