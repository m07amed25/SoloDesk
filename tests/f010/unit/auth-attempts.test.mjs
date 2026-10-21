import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { AuthAttemptManager } from "../../../app/main/identity/auth-attempts.ts";
import { parseIdentityConfig } from "../../../app/main/identity/config.ts";

describe("T013: PKCE and Attempt Lifecycle", () => {
  const config = parseIdentityConfig({
    SOLODESK_TEST_MODE: "1",
    SOLODESK_AUTH_ATTEMPT_LIFETIME_MS: "300000",
  });

  const profileId = "prof_test_001";
  const profileGen = 1;

  it("generates S256 PKCE with high-entropy verifier, state, and nonce", () => {
    const manager = new AuthAttemptManager(config);
    const attempt = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );

    assert.equal(attempt.challenge_method, "S256");
    assert.equal(attempt.status, "pending");
    assert.equal(attempt.profile_id, profileId);
    assert.equal(attempt.profile_generation, profileGen);
    assert.equal(attempt.return_destination_id, "desktop_loopback_v1");

    const proof = manager.getAttemptProof(attempt.attempt_id);
    assert.ok(proof, "Proof must be available for active attempt");
    assert.ok(
      proof.verifier.length >= 43,
      "Verifier must have at least 43 chars (RFC 7636)",
    );
    assert.ok(proof.state.length >= 32, "State must have high entropy");
    assert.ok(proof.nonce.length >= 32, "Nonce must have high entropy");

    // S256 verification: challenge = base64url(sha256(verifier))
    const expectedChallenge = crypto
      .createHash("sha256")
      .update(proof.verifier)
      .digest("base64url");
    assert.equal(attempt.challenge_reference, expectedChallenge);
  });

  it("enforces at most one pending attempt per profile generation via atomic supersession", () => {
    const manager = new AuthAttemptManager(config);
    const attempt1 = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );
    assert.equal(attempt1.status, "pending");

    // Creating second attempt for same profile & generation supersedes the first
    const attempt2 = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );
    assert.equal(attempt2.status, "pending");

    const updated1 = manager.getAttempt(attempt1.attempt_id);
    assert.equal(updated1.status, "superseded");

    // Old attempt proof is wiped
    assert.equal(manager.getAttemptProof(attempt1.attempt_id), null);

    // New attempt proof is live
    assert.ok(manager.getAttemptProof(attempt2.attempt_id));
  });

  it("handles cancellation and clears attempt proof", () => {
    const manager = new AuthAttemptManager(config);
    const attempt = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );

    const cancelled = manager.cancelAttempt(
      attempt.attempt_id,
      profileId,
      profileGen,
    );
    assert.equal(cancelled, true);

    const updated = manager.getAttempt(attempt.attempt_id);
    assert.equal(updated.status, "cancelled");
    assert.equal(manager.getAttemptProof(attempt.attempt_id), null);

    // Cannot cancel already cancelled attempt
    assert.equal(
      manager.cancelAttempt(attempt.attempt_id, profileId, profileGen),
      false,
    );
  });

  it("enforces expiry bounds and rejects expired attempt consumption", () => {
    // Config with 1ms lifetime
    const shortConfig = parseIdentityConfig({
      SOLODESK_TEST_MODE: "1",
      SOLODESK_AUTH_ATTEMPT_LIFETIME_MS: "1",
    });
    const manager = new AuthAttemptManager(shortConfig);
    const attempt = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );

    // Wait a couple ms
    const start = Date.now();
    while (Date.now() - start < 10) {}

    const isExpired = manager.isExpired(attempt.attempt_id);
    assert.equal(isExpired, true);

    // Attempt consumption should fail due to expiry
    const proof = manager.getAttemptProof(attempt.attempt_id);
    const consumeResult = manager.consumeAttempt(
      attempt.attempt_id,
      proof?.state || "",
      profileId,
      profileGen,
    );
    assert.equal(consumeResult.success, false);
    assert.equal(consumeResult.reason, "attempt_expired");
  });

  it("enforces compare-and-set one-time consumption (anti-replay)", () => {
    const manager = new AuthAttemptManager(config);
    const attempt = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );
    const proof = manager.getAttemptProof(attempt.attempt_id);

    // First consumption succeeds
    const first = manager.consumeAttempt(
      attempt.attempt_id,
      proof.state,
      profileId,
      profileGen,
    );
    assert.equal(first.success, true);
    assert.ok(first.verifier);

    // Terminal status is consumed
    const updated = manager.getAttempt(attempt.attempt_id);
    assert.equal(updated.status, "consumed");

    // Second consumption attempt fails (anti-replay)
    const second = manager.consumeAttempt(
      attempt.attempt_id,
      proof.state,
      profileId,
      profileGen,
    );
    assert.equal(second.success, false);
    assert.equal(second.reason, "invalid_attempt_state");

    // Proof was consumed and is now cleared
    assert.equal(manager.getAttemptProof(attempt.attempt_id), null);
  });

  it("enforces terminal immutability: terminal states cannot transition", () => {
    const manager = new AuthAttemptManager(config);
    const attempt = manager.createAttempt(
      profileId,
      profileGen,
      "desktop_loopback_v1",
    );
    manager.cancelAttempt(attempt.attempt_id, profileId, profileGen);

    // Try consuming cancelled
    const result = manager.consumeAttempt(
      attempt.attempt_id,
      "state",
      profileId,
      profileGen,
    );
    assert.equal(result.success, false);

    // Try superseding cancelled
    const updated = manager.getAttempt(attempt.attempt_id);
    assert.equal(updated.status, "cancelled");
  });
});
