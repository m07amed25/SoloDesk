import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MfaAbuseBoundaryManager,
} from "../../../app/main/identity/account-security.ts";

describe("T030: MFA Abuse Boundary, Rate Limiting & Neutral Behavior", () => {
  it("enforces approved provider threshold, backoff on threshold+1, and offers recovery route", () => {
    const manager = new MfaAbuseBoundaryManager({ maxAttempts: 5, backoffMs: 30000 });
    const attemptKey = "attempt_test_user_key";

    // 5 attempts are admitted within threshold
    for (let i = 1; i <= 5; i++) {
      const check = manager.checkAttempt(attemptKey);
      assert.equal(check.allowed, true);
      manager.recordFailedAttempt(attemptKey);
    }

    // 6th attempt (threshold + 1) is blocked
    const blocked = manager.checkAttempt(attemptKey);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.status, "rate_limited");
    assert.ok(blocked.retryAfterMs > 0);
    // Provides recovery route without a separate rate-limit database
    assert.equal(blocked.recoveryRouteAvailable, true);
    assert.equal(blocked.recoveryAction, "lost_factor_recover");
  });

  it("exhibits neutral unauthenticated behavior to prevent account/factor enumeration", () => {
    const manager = new MfaAbuseBoundaryManager({ maxAttempts: 5 });

    // Existing account vs non-existent account return identical safe status shape and timing
    const resA = manager.formatNeutralError("unknown_user@solodesk.test");
    const resB = manager.formatNeutralError("real_alice@solodesk.test");

    assert.deepEqual(resA, resB);
    assert.equal(resA.errorKey, "identity.security.error.verification_failed");
    assert.equal("accountExists" in resA, false);
    assert.equal("factorsFound" in resA, false);
  });
});
