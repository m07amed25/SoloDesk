import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { SessionOwner } from "../../../app/main/identity/session-owner.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";
import { ACCOUNT_A, ISSUER, AUDIENCE, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

describe("T015: Trusted Exchange and Session Owner", () => {
  const tmpDir = path.join(os.tmpdir(), `solodesk-test-session-${crypto.randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const config = parseIdentityConfig({
    SOLODESK_TEST_MODE: "1",
    SOLODESK_AUTH_ISSUER: ISSUER,
    SOLODESK_AUTH_AUDIENCE: AUDIENCE,
  });

  const profileId = "prof_session_001";
  const profileGen = 1;
  const store = new ProtectedIdentityStore(tmpDir, profileId, undefined, TEST_SECRET_PROTECTION);

  // Synthetic provider mock
  function createMockProvider(overrides = {}) {
    return {
      async verifySession(tokens) { return tokens.id_token; },
      async exchangeCodeForTokens({ code, verifier, redirectUri }) {
        if (overrides.error) throw new Error(overrides.error);
        if (code === "invalid_code") throw new Error("invalid_grant");
        return {
          access_token: "mock_jwt_access_token_123",
          refresh_token: "mock_refresh_token_456",
          expires_in: 3600,
          id_token: overrides.idTokenPayload || {
            iss: ISSUER,
            sub: ACCOUNT_A.subject_id,
            aud: AUDIENCE,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            nonce: overrides.expectedNonce || "valid_nonce_123",
            name: ACCOUNT_A.displayName,
            email: "alice@example.com",
          },
        };
      },
    };
  }

  it("exchanges code and produces VerifiedAccount with (issuer_id, subject_id)", async () => {
    const mockProvider = createMockProvider();
    const owner = new SessionOwner(config, store, mockProvider);

    const result = await owner.exchangeAndVerify({
      code: "auth_code_123",
      verifier: "pkce_verifier_xyz",
      redirectUri: "http://127.0.0.1:42042/auth/callback",
      profileId,
      profileGeneration: profileGen,
      expectedNonce: "valid_nonce_123",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.account.issuer_id, ISSUER);
      assert.equal(result.account.subject_id, ACCOUNT_A.subject_id);
      assert.equal(result.account.verification_status, "verified");
      assert.equal(result.account.session_status, "current");
      assert.ok(result.account.display_identifier?.includes("***"), "Email must be masked");

      // Verify that NO workspace or tenant table was created
      const workspaceDbPath = path.join(tmpDir, "workspaces");
      assert.equal(fs.existsSync(workspaceDbPath), false, "Must not create workspace store on auth");
    }
  });

  it("validates issuer and rejects foreign token issuer", async () => {
    const mockProvider = createMockProvider({
      idTokenPayload: {
        iss: "https://evil.attacker.test",
        sub: "usr_attacker",
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: "nonce_1",
      },
      expectedNonce: "nonce_1",
    });

    const owner = new SessionOwner(config, store, mockProvider);
    const result = await owner.exchangeAndVerify({
      code: "code_1",
      verifier: "ver_1",
      redirectUri: "http://127.0.0.1:42042/auth/callback",
      profileId,
      profileGeneration: profileGen,
      expectedNonce: "nonce_1",
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, "issuer_mismatch");
  });

  it("validates audience and rejects mismatched token audience", async () => {
    const mockProvider = createMockProvider({
      idTokenPayload: {
        iss: ISSUER,
        sub: ACCOUNT_A.subject_id,
        aud: "wrong-client-aud",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: "nonce_2",
      },
      expectedNonce: "nonce_2",
    });

    const owner = new SessionOwner(config, store, mockProvider);
    const result = await owner.exchangeAndVerify({
      code: "code_1",
      verifier: "ver_1",
      redirectUri: "http://127.0.0.1:42042/auth/callback",
      profileId,
      profileGeneration: profileGen,
      expectedNonce: "nonce_2",
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, "audience_mismatch");
  });

  it("validates nonce and rejects mismatched nonce (OIDC replay defense)", async () => {
    const mockProvider = createMockProvider({
      idTokenPayload: {
        iss: ISSUER,
        sub: ACCOUNT_A.subject_id,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: "replayed_or_wrong_nonce",
      },
      expectedNonce: "original_expected_nonce",
    });

    const owner = new SessionOwner(config, store, mockProvider);
    const result = await owner.exchangeAndVerify({
      code: "code_1",
      verifier: "ver_1",
      redirectUri: "http://127.0.0.1:42042/auth/callback",
      profileId,
      profileGeneration: profileGen,
      expectedNonce: "original_expected_nonce",
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, "nonce_mismatch");
  });

  it("handles provider failure gracefully and fails closed", async () => {
    const mockProvider = createMockProvider({ error: "network_error" });
    const owner = new SessionOwner(config, store, mockProvider);

    const result = await owner.exchangeAndVerify({
      code: "code_1",
      verifier: "ver_1",
      redirectUri: "http://127.0.0.1:42042/auth/callback",
      profileId,
      profileGeneration: profileGen,
      expectedNonce: "nonce_1",
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, "provider_unavailable");
  });
});
