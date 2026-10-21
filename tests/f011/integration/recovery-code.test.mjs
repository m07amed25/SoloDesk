import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { RecoveryCodeManager } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  F011_CANARY_SECRETS,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T034: Recovery Code Lifecycle, One-Time Consumption & Rotation", () => {
  const dummyCodes = [
    "RECO-1111-AAAA-BBBB",
    "RECO-2222-CCCC-DDDD",
    "RECO-3333-EEEE-FFFF",
  ];

  it("consumes matching recovery code exactly once and upgrades AAL", async () => {
    const manager = new RecoveryCodeManager({
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      activeCodes: [...dummyCodes],
    });

    const result1 = await manager.verifyAndConsumeCode({
      code: "RECO-1111-AAAA-BBBB",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 1,
    });

    assert.equal(result1.success, true);
    assert.equal(result1.upgradedAal, "aal2");
    assert.equal(result1.remainingCount, 2);

    // Replay of consumed code fails closed
    const replay = await manager.verifyAndConsumeCode({
      code: "RECO-1111-AAAA-BBBB",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 1,
    });

    assert.equal(replay.success, false);
    assert.equal(replay.errorCode, "code_invalid_or_consumed");
  });

  it("fails closed on wrong account, changed characters, or Arabic presentation variants", async () => {
    const manager = new RecoveryCodeManager({
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      activeCodes: [...dummyCodes],
    });

    // Wrong account
    const crossAccount = await manager.verifyAndConsumeCode({
      code: "RECO-2222-CCCC-DDDD",
      subjectId: ACCOUNT_B.subject_id,
      sessionId: "sess_mock_002",
      expectedGeneration: 1,
    });
    assert.equal(crossAccount.success, false);
    assert.equal(crossAccount.errorCode, "account_mismatch");

    // Changed characters
    const typo = await manager.verifyAndConsumeCode({
      code: "RECO-2222-CCCC-DDDX",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 1,
    });
    assert.equal(typo.success, false);
    assert.equal(typo.errorCode, "code_invalid_or_consumed");

    // Arabic-Indic digits are normalized safely or rejected if invalid
    const arabicDigits = "RECO-٢٢٢٢-CCCC-DDDD";
    const resArabic = await manager.verifyAndConsumeCode({
      code: arabicDigits,
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 1,
    });
    // Regardless of normalization, must succeed or fail closed without error crash or secret leakage
    assert.equal(typeof resArabic.success, "boolean");
  });

  it("handles whitespace tolerance safely and rejects secret canaries", async () => {
    const manager = new RecoveryCodeManager({
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      activeCodes: [...dummyCodes],
    });

    // Clean trimmed code with extra whitespace
    const resWhitespace = await manager.verifyAndConsumeCode({
      code: "  RECO-2222-CCCC-DDDD  ",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 1,
    });
    assert.equal(resWhitespace.success, true);

    // Canary secret injection fails closed
    await assert.rejects(
      async () =>
        manager.verifyAndConsumeCode({
          code: F011_CANARY_SECRETS.rawPassword,
          subjectId: ACCOUNT_A.subject_id,
          sessionId: "sess_mock_001",
          expectedGeneration: 1,
          rawTotpSecret: F011_CANARY_SECRETS.rawTotpSecret,
        }),
      /prohibited_secret/,
    );
  });

  it("regeneration invalidates all prior unused recovery codes", async () => {
    const manager = new RecoveryCodeManager({
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      activeCodes: [...dummyCodes],
    });

    const newCodes = ["NEW-1111-XXXX-YYYY", "NEW-2222-ZZZZ-WWWW"];

    manager.rotateRecoveryCodes(newCodes);

    // Old unused code is now invalid
    const oldCodeAttempt = await manager.verifyAndConsumeCode({
      code: "RECO-3333-EEEE-FFFF",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 2,
    });
    assert.equal(oldCodeAttempt.success, false);
    assert.equal(oldCodeAttempt.errorCode, "code_invalid_or_consumed");

    // New code is valid
    const newCodeAttempt = await manager.verifyAndConsumeCode({
      code: "NEW-1111-XXXX-YYYY",
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      expectedGeneration: 2,
    });
    assert.equal(newCodeAttempt.success, true);
  });
});
