import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAuthCallback } from "../../../app/main/identity/auth-callback.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";

describe("T014: Auth Callback Grammar and Property Tests", () => {
  const config = parseIdentityConfig({
    SOLODESK_TEST_MODE: "1",
    SOLODESK_AUTH_MAX_QUERY_BYTES: "2048",
  });

  const validState = "st_0123456789abcdef0123456789abcdef";
  const validCode = "authcode_valid_1234567890_abcdefghij";

  it("parses valid success callback with code + state", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&state=${validState}`;
    const result = parseAuthCallback(raw, config);

    assert.equal(result.type, "success");
    if (result.type === "success") {
      assert.equal(result.code, validCode);
      assert.equal(result.state, validState);
    }
  });

  it("parses valid failure callback with error + state", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?error=access_denied&state=${validState}`;
    const result = parseAuthCallback(raw, config);

    assert.equal(result.type, "error");
    if (result.type === "error") {
      assert.equal(result.error, "access_denied");
      assert.equal(result.state, validState);
    }
  });

  it("parses optional response issuer if provided and matches config", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&state=${validState}&iss=${encodeURIComponent(config.issuer)}`;
    const result = parseAuthCallback(raw, config);

    assert.equal(result.type, "success");
    if (result.type === "success") {
      assert.equal(result.responseIssuer, config.issuer);
    }
  });

  it("rejects mismatched response issuer", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&state=${validState}&iss=https://evil-idp.attacker.test`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "issuer_mismatch");
  });

  it("enforces mutual exclusivity: rejects code AND error together", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&error=access_denied&state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "ambiguous_callback_fields");
  });

  it("rejects callback with neither code nor error", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "missing_code_or_error");
  });

  it("rejects URL fragments", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&state=${validState}#token=leak`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "fragments_prohibited");
  });

  it("rejects duplicate query parameters", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&code=duplicate&state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "duplicate_query_keys");
  });

  it("rejects unknown query parameters", () => {
    const raw = `http://127.0.0.1:42042/auth/callback?code=${validCode}&state=${validState}&unknown_arg=xyz`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "unknown_query_keys");
  });

  it("rejects control characters in parameters", () => {
    const badCode = `code\u0000bad`;
    const raw = `http://127.0.0.1:42042/auth/callback?code=${encodeURIComponent(badCode)}&state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "control_characters_prohibited");
  });

  it("rejects nested URLs in code or state", () => {
    const nested = encodeURIComponent("https://attacker.test/callback");
    const raw = `http://127.0.0.1:42042/auth/callback?code=${nested}&state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "nested_destinations_prohibited");
  });

  it("enforces byte bounds: maximum bytes passes, maximum+1 fails", () => {
    // 2048 is max
    const base = `http://127.0.0.1:42042/auth/callback?code=${validCode}&state=`;
    const fillLength = 2048 - base.length;
    const exactMaxUrl = base + "a".repeat(fillLength);
    assert.equal(Buffer.byteLength(exactMaxUrl), 2048);

    const maxResult = parseAuthCallback(exactMaxUrl, config);
    // Since state is long but within length, should pass or fail on state grammar, not byte limit
    assert.notEqual(maxResult.reason, "payload_too_large");

    // 2049 bytes
    const overflowUrl = exactMaxUrl + "b";
    assert.equal(Buffer.byteLength(overflowUrl), 2049);
    const overflowResult = parseAuthCallback(overflowUrl, config);
    assert.equal(overflowResult.type, "invalid");
    assert.equal(overflowResult.reason, "payload_too_large");
  });

  it("parses custom scheme format (solodesk://auth/callback?code=...)", () => {
    const raw = `solodesk://auth/callback?code=${validCode}&state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "success");
    if (result.type === "success") {
      assert.equal(result.code, validCode);
      assert.equal(result.state, validState);
    }
  });

  it("rejects unapproved destination scheme or path", () => {
    const raw = `http://127.0.0.1:42042/wrong/path?code=${validCode}&state=${validState}`;
    const result = parseAuthCallback(raw, config);
    assert.equal(result.type, "invalid");
    assert.equal(result.reason, "unapproved_callback_destination");
  });
});
