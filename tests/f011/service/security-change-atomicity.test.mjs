import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  AccountSecurityService,
} from "../../../supabase/functions/_shared/account-security.ts";
import {
  ACCOUNT_A,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T043: Security Change Atomicity, Generation Increment & Concurrency", () => {
  const identity = {
    issuerId: ACCOUNT_A.issuer_id,
    subjectId: ACCOUNT_A.subject_id,
  };

  it("advances generation once for first change and rejects concurrent change on stale generation", async () => {
    const service = new AccountSecurityService();
    const op1 = crypto.randomUUID();
    const op2 = crypto.randomUUID();
    const digest1 = crypto.createHash("sha256").update("change_1").digest("hex");
    const digest2 = crypto.createHash("sha256").update("change_2").digest("hex");

    // Both begin with expected generation 1
    await service.begin(identity, {
      operationId: op1,
      purpose: "factor_disable",
      expectedGeneration: 1,
      requestDigest: digest1,
      policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
    });

    await service.begin(identity, {
      operationId: op2,
      purpose: "recovery_codes_regenerate",
      expectedGeneration: 1,
      requestDigest: digest2,
      policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
    });

    // Commit change 1 -> increments generation to 2
    const res1 = await service.observe(identity, {
      operationId: op1,
      providerEffect: "observed_applied",
      safeReasonCode: "factor_disabled",
    });
    assert.equal(res1.securityGeneration, 2);

    // Now attempt to observe change 2 claiming old generation or trying to commit
    const state = await service.getState(identity);
    assert.equal(state.security_generation, 2);

    // Any new begin claiming generation 1 now fails
    const op3 = crypto.randomUUID();
    const digest3 = crypto.createHash("sha256").update("change_3").digest("hex");
    await assert.rejects(
      async () =>
        service.begin(identity, {
          operationId: op3,
          purpose: "factor_disable",
          expectedGeneration: 1,
          requestDigest: digest3,
          policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
        }),
      /generation_mismatch/,
    );
  });

  it("converges identical retry with same digest and rejects changed digest", async () => {
    const service = new AccountSecurityService();
    const opId = crypto.randomUUID();
    const digest = crypto.createHash("sha256").update("same_payload").digest("hex");
    const changedDigest = crypto.createHash("sha256").update("different_payload").digest("hex");

    const res1 = await service.begin(identity, {
      operationId: opId,
      purpose: "recovery_codes_regenerate",
      expectedGeneration: 1,
      requestDigest: digest,
      policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
    });
    assert.equal(res1.status, "in_progress");

    // Identical retry converges
    const retry = await service.begin(identity, {
      operationId: opId,
      purpose: "recovery_codes_regenerate",
      expectedGeneration: 1,
      requestDigest: digest,
      policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
    });
    assert.equal(retry.status, "in_progress");

    // Changed digest on same operationId is rejected
    await assert.rejects(
      async () =>
        service.begin(identity, {
          operationId: opId,
          purpose: "recovery_codes_regenerate",
          expectedGeneration: 1,
          requestDigest: changedDigest,
          policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
        }),
      /changed_digest/,
    );
  });
});
