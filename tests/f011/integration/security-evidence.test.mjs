import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  AccountSecurityService,
} from "../../../supabase/functions/_shared/account-security.ts";
import {
  ACCOUNT_A,
  F011_CANARY_SECRETS,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";


describe("T044: Security Evidence Privacy, Notification & Secret Redaction", () => {
  const identity = {
    issuerId: ACCOUNT_A.issuer_id,
    subjectId: ACCOUNT_A.subject_id,
  };

  it("produces strictly redacted evidence matching the closed allowlist", async () => {
    const service = new AccountSecurityService();
    const opId = crypto.randomUUID();
    const digest = crypto.createHash("sha256").update("op").digest("hex");

    await service.begin(identity, {
      operationId: opId,
      purpose: "factor_enroll",
      expectedGeneration: 1,
      requestDigest: digest,
      policyVersion: VALID_POLICY_SYNTHETIC.policy_version,
    });

    await service.observe(identity, {
      operationId: opId,
      providerEffect: "observed_applied",
      safeProviderReference: "factor_totp_ref_001",
      sessionConsequence: "continues_aal2",
      safeReasonCode: "enrolled_safely",
    });

    const evidenceList = await service.getEvidence(identity);
    assert.ok(evidenceList.length > 0);

    const latest = evidenceList[evidenceList.length - 1];
    assert.ok(latest);


    // Verify allowlisted fields
    assert.equal(latest.identity_event_type, "factor_enrollment_accepted");
    assert.equal(latest.outcome, "accepted");
    assert.equal(latest.security_generation, 2);

    // Verify zero secret leakage
    const serialized = JSON.stringify(latest);
    for (const canary of Object.values(F011_CANARY_SECRETS)) {
      if (typeof canary === "string") {
        assert.equal(serialized.includes(canary), false);
      }
    }

    assert.equal("raw_totp_secret" in latest, false);
    assert.equal("recovery_codes" in latest, false);
    assert.equal("password" in latest, false);
    assert.equal("token" in latest, false);
  });
});

