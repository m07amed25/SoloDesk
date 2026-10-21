import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SupabaseProviderAdapter } from "../../../app/main/identity/provider-adapter.ts";
import { validateProviderSecurityProjection } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  F011_CANARY_SECRETS,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T019: Provider Security Adapter Observations", () => {
  const dummyConfig = {
    issuer: "https://auth.solodesk.test",
    audience: "solodesk-desktop",
    publishableKey: "test-publishable-key",
    serviceDomain: "https://auth.solodesk.test",
    authServerUrl: "https://auth.solodesk.test",
    securityPolicy: VALID_POLICY_SYNTHETIC,
  };

  const createFakeJwt = (sub, aal = "aal1", expOffset = 300) => {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "https://auth.solodesk.test",
        sub,
        aud: "solodesk-desktop",
        session_id: "sess_mock_00000000-0000-4000-8000-000000000001",
        aal,
        amr: [{ method: aal === "aal2" ? "totp" : "password", timestamp: now }],
        exp: now + expOffset,
        iat: now,
      }),
    ).toString("base64url");
    return `${header}.${payload}.mock_signature`;
  };

  it("observes security projection for verified account with valid AAL and factors", async () => {
    const adapter = new SupabaseProviderAdapter(dummyConfig);
    const validTokens = {
      access_token: createFakeJwt(ACCOUNT_A.subject_id, "aal2"),
      expires_in: 300,
    };

    // Mock global fetch for provider user and factors endpoints
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/user")) {
        return new Response(
          JSON.stringify({
            id: ACCOUNT_A.subject_id,
            email: "alice@solodesk.test",
            factors: [
              {
                id: "factor_totp_00000000-0000-4000-8000-000000000001",
                friendly_name: "Alice Authenticator",
                factor_type: "totp",
                status: "verified",
                created_at: "2026-10-21T10:00:00.000Z",
                updated_at: "2026-10-21T10:05:00.000Z",
                // Simulate potential provider secret leak in raw payload to verify adapter strips it
                secret: F011_CANARY_SECRETS.rawTotpSecret,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    };

    try {
      const projection = await adapter.observeSecurityProjection(validTokens, {
        issuerId: ACCOUNT_A.issuer_id,
        subjectId: ACCOUNT_A.subject_id,
      });

      assert.ok(projection, "projection must be returned");
      assert.equal(validateProviderSecurityProjection(projection), true);
      assert.equal(projection.issuer_id, ACCOUNT_A.issuer_id);
      assert.equal(projection.subject_id, ACCOUNT_A.subject_id);
      assert.equal(projection.current_aal, "aal2");
      assert.equal(projection.factor_summaries.length, 1);
      assert.equal(
        projection.factor_summaries[0].friendly_name,
        "Alice Authenticator",
      );
      // Must not contain canary secret anywhere
      const json = JSON.stringify(projection);
      assert.equal(json.includes(F011_CANARY_SECRETS.rawTotpSecret), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails closed when token subject mismatches verified account", async () => {
    const adapter = new SupabaseProviderAdapter(dummyConfig);
    const mismatchedTokens = {
      access_token: createFakeJwt(ACCOUNT_B.subject_id, "aal1"),
    };

    await assert.rejects(
      () =>
        adapter.observeSecurityProjection(mismatchedTokens, {
          issuerId: ACCOUNT_A.issuer_id,
          subjectId: ACCOUNT_A.subject_id,
        }),
      (err) => err instanceof Error && err.message === "account_mismatch",
    );
  });

  it("fails closed on expired or signature-invalid tokens", async () => {
    const adapter = new SupabaseProviderAdapter(dummyConfig);
    const expiredTokens = {
      access_token: createFakeJwt(ACCOUNT_A.subject_id, "aal1", -10),
    };

    await assert.rejects(
      () =>
        adapter.observeSecurityProjection(expiredTokens, {
          issuerId: ACCOUNT_A.issuer_id,
          subjectId: ACCOUNT_A.subject_id,
        }),
      (err) =>
        err instanceof Error &&
        (err.message === "session_rejected" ||
          err.message === "invalid_session_signature"),
    );
  });

  it("sanitizes raw provider errors and refuses to leak secrets in exceptions", async () => {
    const adapter = new SupabaseProviderAdapter(dummyConfig);
    const validTokens = {
      access_token: createFakeJwt(ACCOUNT_A.subject_id, "aal1"),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      // Simulate raw provider error returning internal canary data
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: `Crash with secret: ${F011_CANARY_SECRETS.rawPassword}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    };

    try {
      await assert.rejects(
        () =>
          adapter.observeSecurityProjection(validTokens, {
            issuerId: ACCOUNT_A.issuer_id,
            subjectId: ACCOUNT_A.subject_id,
          }),
        (err) => {
          assert.equal(err instanceof Error, true);
          assert.equal(err.message, "provider_unavailable");
          assert.equal(
            err.message.includes(F011_CANARY_SECRETS.rawPassword),
            false,
          );
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("correctly identifies unsupported provider capability", async () => {
    const adapter = new SupabaseProviderAdapter(dummyConfig);
    const validTokens = {
      access_token: createFakeJwt(ACCOUNT_A.subject_id, "aal1"),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes("/user")) {
        return new Response(
          JSON.stringify({
            id: ACCOUNT_A.subject_id,
            // user object without MFA factor support
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    try {
      const projection = await adapter.observeSecurityProjection(validTokens, {
        issuerId: ACCOUNT_A.issuer_id,
        subjectId: ACCOUNT_A.subject_id,
      });
      assert.equal(projection.factor_summaries.length, 0);
      assert.equal(projection.current_aal, "aal1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
