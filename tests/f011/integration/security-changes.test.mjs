import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { SensitiveChangeManager } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  F011_CANARY_SECRETS,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T042: Sensitive Security Changes, Reauthentication & Sign-Out Scope", () => {
  it("admits sensitive changes only with fresh purpose-bound proof", async () => {
    const manager = new SensitiveChangeManager({
      securityPolicy: VALID_POLICY_SYNTHETIC,
      proofTtlMs: 300000, // 5 minutes
    });

    const now = Date.now();
    const freshProof = {
      proofId: crypto.randomUUID(),
      purpose: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      verifiedAal: "aal2",
      issuedAt: new Date(now - 10000).toISOString(),
    };

    const result = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: freshProof,
      securityGeneration: 1,
    });

    assert.equal(result.success, true);
    assert.equal(result.newSecurityGeneration, 2);
    assert.equal(result.sessionConsequence.current_session, "continues_aal1");
    assert.equal(result.sessionConsequence.other_sessions, "ended");
  });

  it("rejects stale, expired, or wrong-purpose proof", async () => {
    const manager = new SensitiveChangeManager({
      securityPolicy: VALID_POLICY_SYNTHETIC,
      proofTtlMs: 300000,
    });

    // Stale/expired proof (issued 10 minutes ago)
    const expiredProof = {
      proofId: crypto.randomUUID(),
      purpose: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      verifiedAal: "aal2",
      issuedAt: new Date(Date.now() - 600000).toISOString(),
    };

    const staleRes = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: expiredProof,
      securityGeneration: 1,
    });

    assert.equal(staleRes.success, false);
    assert.equal(staleRes.errorCode, "stale_or_expired_proof");

    // Wrong purpose proof (mfa_challenge proof used for factor_disable)
    const wrongPurposeProof = {
      proofId: crypto.randomUUID(),
      purpose: "mfa_challenge",
      subjectId: ACCOUNT_A.subject_id,
      verifiedAal: "aal2",
      issuedAt: new Date().toISOString(),
    };

    const wrongPurposeRes = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: wrongPurposeProof,
      securityGeneration: 1,
    });

    assert.equal(wrongPurposeRes.success, false);
    assert.equal(wrongPurposeRes.errorCode, "proof_purpose_mismatch");

    // Insufficient AAL proof (AAL1 proof)
    const aal1Proof = {
      proofId: crypto.randomUUID(),
      purpose: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      verifiedAal: "aal1",
      issuedAt: new Date().toISOString(),
    };
    const aal1Res = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: aal1Proof,
      securityGeneration: 1,
    });
    assert.equal(aal1Res.success, false);
    assert.equal(aal1Res.errorCode, "insufficient_aal");

    // Malformed non-finite timestamp proof
    const malformedProof = {
      proofId: crypto.randomUUID(),
      purpose: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      verifiedAal: "aal2",
      issuedAt: "invalid_date_not_finite",
    };
    const malformedRes = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: malformedProof,
      securityGeneration: 1,
    });
    assert.equal(malformedRes.success, false);
    assert.equal(malformedRes.errorCode, "stale_or_expired_proof");

    // Proof reuse prevention
    const reusableProof = {
      proofId: crypto.randomUUID(),
      purpose: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      verifiedAal: "aal2",
      issuedAt: new Date().toISOString(),
    };
    const firstApply = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: reusableProof,
      securityGeneration: 1,
    });
    assert.equal(firstApply.success, true);

    const replayedApply = await manager.applySensitiveChange({
      changeType: "factor_disable",
      subjectId: ACCOUNT_A.subject_id,
      proof: reusableProof,
      securityGeneration: 2,
    });
    assert.equal(replayedApply.success, false);
    assert.equal(replayedApply.errorCode, "stale_or_expired_proof");
  });

  it("fails closed on secret canaries in change requests", async () => {
    const manager = new SensitiveChangeManager({
      securityPolicy: VALID_POLICY_SYNTHETIC,
    });

    await assert.rejects(
      async () =>
        manager.applySensitiveChange({
          changeType: "primary_credential_change",
          subjectId: ACCOUNT_A.subject_id,
          proof: {
            proofId: crypto.randomUUID(),
            purpose: "primary_credential_change",
            subjectId: ACCOUNT_A.subject_id,
            verifiedAal: "aal2",
            issuedAt: new Date().toISOString(),
          },
          securityGeneration: 1,
          rawPassword: F011_CANARY_SECRETS.rawPassword,
        }),
      /prohibited_secret/,
    );
  });
});
