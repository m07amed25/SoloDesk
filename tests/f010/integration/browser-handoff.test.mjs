import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  BrowserHandoffManager,
  buildAuthorizationUrl,
  isAllowedHostedUrl,
} from "../../../app/main/identity/browser-handoff.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";

describe("T016: Electron Ingress and Browser Launch Handoff", () => {
  const config = parseIdentityConfig({
    SOLODESK_TEST_MODE: "1",
    SOLODESK_AUTH_HOSTED_ORIGIN: "https://auth.solodesk.test",
    SOLODESK_AUTH_HOSTED_PATH: "/auth/signin",
  });

  it("builds authorization URL only from trusted config and generated parameters", () => {
    const authUrl = buildAuthorizationUrl(config, {
      challenge: "test_challenge_123",
      state: "test_state_456",
      nonce: "test_nonce_789",
      redirectUri: "http://127.0.0.1:42042/auth/callback",
    });

    const parsed = new URL(authUrl);
    assert.equal(parsed.origin, "https://auth.solodesk.test");
    assert.equal(parsed.pathname, "/auth/signin");
    assert.equal(parsed.searchParams.get("client_id"), config.audience);
    assert.equal(parsed.searchParams.get("response_type"), "code");
    assert.equal(parsed.searchParams.get("code_challenge"), "test_challenge_123");
    assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
    assert.equal(parsed.searchParams.get("state"), "test_state_456");
    assert.equal(parsed.searchParams.get("nonce"), "test_nonce_789");
    assert.equal(parsed.searchParams.get("redirect_uri"), "http://127.0.0.1:42042/auth/callback");
  });

  it("validates exact hosted HTTPS allowlist and rejects untrusted origins", () => {
    assert.equal(
      isAllowedHostedUrl("https://auth.solodesk.test/auth/signin?foo=bar", config),
      true,
    );
    // Reject HTTP outside of test loopback
    assert.equal(
      isAllowedHostedUrl("http://auth.solodesk.test/auth/signin", config),
      false,
    );
    // Reject other domains
    assert.equal(
      isAllowedHostedUrl("https://malicious.attacker.test/auth/signin", config),
      false,
    );
    // Reject javascript: or file:
    assert.equal(
      isAllowedHostedUrl("javascript:alert(1)", config),
      false,
    );
  });

  it("starts ephemeral loopback listener, receives single callback request and closes", async () => {
    let capturedCallback = null;
    const handoff = new BrowserHandoffManager(config, {
      onCallbackReceived: (url) => {
        capturedCallback = url;
      },
    });

    const port = await handoff.startLoopbackListener();
    assert.ok(port > 0, "Ephemeral port must be allocated");

    // Send HTTP GET request to loopback server
    const reqUrl = `http://127.0.0.1:${port}/auth/callback?code=mock_code&state=mock_state`;
    const res = await fetch(reqUrl);
    assert.equal(res.status, 200);

    const body = await res.text();
    assert.ok(body.includes("SoloDesk"), "Response should provide safe return guidance");
    assert.equal(capturedCallback, reqUrl);

    // Give server a moment to close
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(handoff.isLoopbackActive(), false, "Listener must close after single request");
  });

  it("separates auth callbacks from ordinary F004 routes", () => {
    const handoff = new BrowserHandoffManager(config, {});

    // Ordinary route: solodesk://open/home
    assert.equal(handoff.isIdentityCallbackUrl("solodesk://open/home"), false);

    // Auth callback: solodesk://auth/callback?code=...
    assert.equal(
      handoff.isIdentityCallbackUrl("solodesk://auth/callback?code=123&state=456"),
      true,
    );

    // Loopback callback: http://127.0.0.1:.../auth/callback?...
    assert.equal(
      handoff.isIdentityCallbackUrl("http://127.0.0.1:42042/auth/callback?code=123"),
      true,
    );
  });
});
