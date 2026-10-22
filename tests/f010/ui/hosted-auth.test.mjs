import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAuthorizationUrl,
  isAllowedHostedUrl,
} from "../../../app/main/identity/browser-handoff.ts";

describe("T057: Hosted Auth URL Construction and Restrictions", () => {
  const config = {
    hostedOrigin: "https://auth.solodesk.test",
    hostedPath: "/authorize",
    audience: "solodesk-desktop",
    destinations: {
      desktop_loopback_v1: {
        scheme: "http",
        host: "127.0.0.1",
        path: "/auth/callback",
      },
    },
  };

  it("builds compliant PKCE authorization URL without leaking secrets or verifiers", () => {
    const authUrl = buildAuthorizationUrl(config, {
      challenge: "test-challenge-s256-hash",
      state: "test-state-nonce-token",
      nonce: "test-nonce-random-bytes",
      redirectUri: "http://127.0.0.1:45678/auth/callback",
    });

    const parsed = new URL(authUrl);
    assert.equal(parsed.origin, "https://auth.solodesk.test");
    assert.equal(parsed.pathname, "/authorize");
    assert.equal(parsed.searchParams.get("response_type"), "code");
    assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
    assert.equal(parsed.searchParams.get("code_challenge"), "test-challenge-s256-hash");
    assert.equal(parsed.searchParams.get("client_id"), "solodesk-desktop");

    // Must NEVER include the raw code_verifier in the URL
    assert.equal(parsed.searchParams.has("code_verifier"), false);
    assert.equal(parsed.searchParams.has("verifier"), false);
    assert.equal(parsed.searchParams.has("secret"), false);
  });

  it("strictly validates allowed hosted origins and rejects unauthorized destinations", () => {
    assert.equal(
      isAllowedHostedUrl("https://auth.solodesk.test/authorize?state=123", config),
      true,
    );
    assert.equal(
      isAllowedHostedUrl("https://evil.attacker.com/authorize", config),
      false,
    );
    assert.equal(
      isAllowedHostedUrl("https://auth.solodesk.test/malicious-endpoint", config),
      false,
    );
    assert.equal(
      isAllowedHostedUrl("javascript:alert(1)", config),
      false,
    );
  });
});
