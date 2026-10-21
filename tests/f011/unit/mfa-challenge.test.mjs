import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  MfaChallengeManager,
} from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  F011_CANARY_SECRETS,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T028: MFA Challenge Purpose and Attempt Binding", () => {
  const createValidContext = (overrides = {}) => ({
    challengeId: crypto.randomUUID(),
    originatingAttemptId: crypto.randomUUID(),
    issuerId: ACCOUNT_A.issuer_id,
    subjectId: ACCOUNT_A.subject_id,
    sessionId: "sess_mock_00000000-0000-4000-8000-000000000001",
    purpose: "mfa_challenge",
    expectedSecurityGeneration: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    completed: false,
    ...overrides,
  });

  it("binds valid challenge to account, originating attempt, purpose, and live session", () => {
    const manager = new MfaChallengeManager();
    const ctx = createValidContext();

    const registered = manager.registerChallenge(ctx);
    assert.equal(registered.challengeId, ctx.challengeId);
    assert.equal(registered.completed, false);

    // Verify valid verification advances originating attempt exactly once
    const verified = manager.verifyChallenge(ctx.challengeId, {
      observedAal: "aal2",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: ctx.sessionId,
      securityGeneration: 1,
    });

    assert.equal(verified.success, true);
    assert.equal(verified.advancedAttemptId, ctx.originatingAttemptId);

    // Attempting to reuse or replay the completed challenge yields zero authority
    const replayed = manager.verifyChallenge(ctx.challengeId, {
      observedAal: "aal2",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: ctx.sessionId,
      securityGeneration: 1,
    });

    assert.equal(replayed.success, false);
    assert.equal(replayed.errorCode, "challenge_already_consumed");
  });

  it("fails closed on cross-account or cross-purpose verification attempts", () => {
    const manager = new MfaChallengeManager();
    const ctx = createValidContext();
    manager.registerChallenge(ctx);

    // Cross-account verification attempt
    const crossAccount = manager.verifyChallenge(ctx.challengeId, {
      observedAal: "aal2",
      subjectId: ACCOUNT_B.subject_id,
      sessionId: ctx.sessionId,
      securityGeneration: 1,
    });
    assert.equal(crossAccount.success, false);
    assert.equal(crossAccount.errorCode, "account_mismatch");

    // Stale generation verification attempt
    const staleGen = manager.verifyChallenge(ctx.challengeId, {
      observedAal: "aal2",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: ctx.sessionId,
      securityGeneration: 2, // Changed generation!
    });
    assert.equal(staleGen.success, false);
    assert.equal(staleGen.errorCode, "stale_generation");
  });

  it("rejects expired, insufficient AAL, or secret-shaped challenge inputs", () => {
    const manager = new MfaChallengeManager();
    const expiredCtx = createValidContext({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    manager.registerChallenge(expiredCtx);

    const expiredRes = manager.verifyChallenge(expiredCtx.challengeId, {
      observedAal: "aal2",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: expiredCtx.sessionId,
      securityGeneration: 1,
    });
    assert.equal(expiredRes.success, false);
    assert.equal(expiredRes.errorCode, "challenge_expired");

    // Insufficient AAL
    const activeCtx = createValidContext();
    manager.registerChallenge(activeCtx);
    const insufficientAal = manager.verifyChallenge(activeCtx.challengeId, {
      observedAal: "aal1",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: activeCtx.sessionId,
      securityGeneration: 1,
    });
    assert.equal(insufficientAal.success, false);
    assert.equal(insufficientAal.errorCode, "insufficient_aal");

    // Rejection of secret canary
    assert.throws(
      () =>
        manager.registerChallenge({
          ...activeCtx,
          challengeId: crypto.randomUUID(),
          raw_totp_secret: F011_CANARY_SECRETS.rawTotpSecret,
        }),
      /prohibited_secret/,
    );
  });
});
