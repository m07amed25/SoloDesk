import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { AccountSecurityService } from "../../../supabase/functions/_shared/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  VALID_POLICY_SYNTHETIC,
  F011_CANARY_SECRETS,
} from "../fixtures/security-fixtures.mjs";

describe("T020: Factor Enrollment & Recovery Code Acknowledgment Service Logic", () => {
  const verifiedAccount = {
    issuerId: ACCOUNT_A.issuer_id,
    subjectId: ACCOUNT_A.subject_id,
    sessionId: "sess_mock_00000000-0000-4000-8000-000000000001",
  };

  const createValidBeginRequest = (opId = crypto.randomUUID(), gen = 1) => ({
    operationId: opId,
    purpose: "factor_enroll",
    expectedGeneration: gen,
    requestDigest: crypto
      .createHash("sha256")
      .update("valid_enroll_request")
      .digest("hex"),
    policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
  });

  it("admits valid begin request and rejects changed digest or wrong generation", async () => {
    const service = new AccountSecurityService();
    const opId = crypto.randomUUID();
    const validReq = createValidBeginRequest(opId, 1);

    // Initial begin succeeds
    const res1 = await service.begin(verifiedAccount, validReq);
    assert.ok(res1);
    assert.equal(res1.status, "in_progress");

    // Identical retry converges
    const resRetry = await service.begin(verifiedAccount, validReq);
    assert.equal(resRetry.operationId, opId);
    assert.equal(resRetry.status, "in_progress");

    // Changed digest on same operationId is rejected
    await assert.rejects(
      () =>
        service.begin(verifiedAccount, {
          ...validReq,
          requestDigest: crypto
            .createHash("sha256")
            .update("different_digest")
            .digest("hex"),
        }),
      /changed_digest|invalid_request/,
    );

    // Wrong expected generation is rejected
    await assert.rejects(
      () =>
        service.begin(verifiedAccount, {
          ...createValidBeginRequest(crypto.randomUUID(), 99),
        }),
      /stale_generation|generation_mismatch/,
    );
  });

  it("transitions to recovery_codes_pending and increments generation once on observed_applied", async () => {
    const service = new AccountSecurityService();
    const opId = crypto.randomUUID();
    await service.begin(verifiedAccount, createValidBeginRequest(opId, 1));

    const observeReq = {
      operationId: opId,
      providerEffect: "observed_applied",
      safeProviderReference: "factor_totp_00000000-0000-4000-8000-000000000001",
      sessionConsequence: "standard_signout_other_sessions_v1",
      safeReasonCode: "factor_enrolled",
    };

    const observeRes = await service.observe(verifiedAccount, observeReq);
    assert.ok(observeRes);
    assert.equal(observeRes.securityGeneration, 2);
    assert.equal(observeRes.setupState, "recovery_codes_pending");

    // Duplicate observe call converges and does NOT increment generation again
    const dupRes = await service.observe(verifiedAccount, observeReq);
    assert.equal(dupRes.securityGeneration, 2);
    assert.equal(dupRes.setupState, "recovery_codes_pending");

    // Verify state query returns recovery_codes_pending and gen 2
    const state = await service.getState(verifiedAccount);
    assert.equal(state.security_generation, 2);
    assert.equal(state.setup_state, "recovery_codes_pending");
    assert.equal(state.ready, false);
  });

  it("transitions from recovery_codes_pending to ready on acknowledgment without another increment", async () => {
    const service = new AccountSecurityService();
    const opId = crypto.randomUUID();
    await service.begin(verifiedAccount, createValidBeginRequest(opId, 1));
    await service.observe(verifiedAccount, {
      operationId: opId,
      providerEffect: "observed_applied",
    });

    // Stale acknowledgment with wrong generation is rejected
    await assert.rejects(
      () =>
        service.acknowledgeRecoveryCodes(verifiedAccount, {
          operationId: opId,
          expectedGeneration: 1, // Current is 2!
        }),
      /stale_generation|generation_mismatch/,
    );

    // Matching acknowledgment succeeds
    const ackRes = await service.acknowledgeRecoveryCodes(verifiedAccount, {
      operationId: opId,
      expectedGeneration: 2,
    });

    assert.ok(ackRes);
    assert.equal(ackRes.setupState, "ready");
    assert.equal(ackRes.securityGeneration, 2); // Does NOT increment again

    const state = await service.getState(verifiedAccount);
    assert.equal(state.setup_state, "ready");
    assert.equal(state.ready, true);
    assert.equal(state.security_generation, 2);
  });

  it("emits strictly redacted audit evidence without secret canary leakage", async () => {
    const service = new AccountSecurityService();
    const opId = crypto.randomUUID();
    await service.begin(verifiedAccount, createValidBeginRequest(opId, 1));
    await service.observe(verifiedAccount, {
      operationId: opId,
      providerEffect: "observed_applied",
    });
    await service.acknowledgeRecoveryCodes(verifiedAccount, {
      operationId: opId,
      expectedGeneration: 2,
    });

    const evidenceList = await service.getEvidence(verifiedAccount);
    assert.ok(Array.isArray(evidenceList));
    assert.equal(evidenceList.length >= 2, true);

    const evidenceJson = JSON.stringify(evidenceList);
    // Canary scan
    for (const secretVal of Object.values(F011_CANARY_SECRETS)) {
      if (typeof secretVal === "string") {
        assert.equal(evidenceJson.includes(secretVal), false);
      }
    }
  });
});
