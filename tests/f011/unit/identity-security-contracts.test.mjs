import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FACTOR_REQUIREMENTS,
  FACTOR_TYPES,
  RECOVERY_METHODS,
  SECURITY_PURPOSES,
  SECURITY_SETUP_STATES,
  RECOVERY_HANDOFF_STATES,
  CURRENT_SESSION_CONSEQUENCES,
  OTHER_SESSIONS_CONSEQUENCES,
  LOCAL_DATA_CONSEQUENCES,
  WORKSPACE_AUTHORITY_CONSEQUENCE,
  RENDERER_NEXT_ACTIONS,
  isIdentitySecurityPolicy,
  isRendererAccountSecurityState,
  isSessionConsequence,
  isSecurityPurpose,
  isSecuritySetupState,
  isRecoveryHandoffState,
  containsProhibitedSecurityKey,
} from "../../../app/shared/identity-security-contracts.ts";
import {
  projectIdentityEvidence,
  IDENTITY_EVENT_TYPES,
  IDENTITY_OUTCOMES,
} from "../../../packages/contracts/src/identity-evidence.ts";
import {
  VALID_POLICY_SYNTHETIC,
  VALID_POLICY_REQUIRED,
  VALID_POLICY_UNAVAILABLE,
  INVALID_POLICY_BOUNDS,
  VALID_SESSION_CONSEQUENCE,
  MISSING_LOCAL_KEY_CONSEQUENCE,
  F011_CANARY_SECRETS,
} from "../fixtures/security-fixtures.mjs";

describe("T016: Identity Security Contracts and Policy Validation", () => {
  it("enforces closed enums and verbatim rules", () => {
    assert.deepEqual([...FACTOR_REQUIREMENTS], ["unavailable", "optional", "required"]);
    assert.deepEqual([...FACTOR_TYPES], ["totp"]);
    assert.deepEqual([...RECOVERY_METHODS], ["provider_recovery_codes", "none"]);
    assert.equal(SECURITY_PURPOSES.length, 10);
    assert.equal(SECURITY_SETUP_STATES.length, 9);
    assert.equal(RECOVERY_HANDOFF_STATES.length, 5);
    assert.equal(WORKSPACE_AUTHORITY_CONSEQUENCE, "must_revalidate");

    for (const purpose of SECURITY_PURPOSES) {
      assert.equal(isSecurityPurpose(purpose), true);
    }
    assert.equal(isSecurityPurpose("arbitrary_purpose"), false);

    for (const state of SECURITY_SETUP_STATES) {
      assert.equal(isSecuritySetupState(state), true);
    }
    assert.equal(isSecuritySetupState("logged_in"), false);

    for (const handoff of RECOVERY_HANDOFF_STATES) {
      assert.equal(isRecoveryHandoffState(handoff), true);
    }
    assert.equal(isRecoveryHandoffState("unknown_handoff"), false);
  });

  it("validates versioned IdentitySecurityPolicy and rejects violations", () => {
    assert.equal(isIdentitySecurityPolicy(VALID_POLICY_SYNTHETIC), true);
    assert.equal(isIdentitySecurityPolicy(VALID_POLICY_REQUIRED), true);
    assert.equal(isIdentitySecurityPolicy(VALID_POLICY_UNAVAILABLE), true);

    // Max+1 bounds check
    assert.equal(isIdentitySecurityPolicy(INVALID_POLICY_BOUNDS), false);

    // Multiple factors or non-totp factors rejected
    const multiFactorPolicy = {
      ...VALID_POLICY_SYNTHETIC,
      factor_types: ["totp", "sms"],
    };
    assert.equal(isIdentitySecurityPolicy(multiFactorPolicy), false);

    // Missing effective_at
    const missingDatePolicy = {
      ...VALID_POLICY_SYNTHETIC,
      effective_at: "not-a-date",
    };
    assert.equal(isIdentitySecurityPolicy(missingDatePolicy), false);

    // Reject required MFA when recovery_method is not provider_recovery_codes
    const invalidRecoveryForRequired = {
      ...VALID_POLICY_REQUIRED,
      recovery_method: "none",
    };
    assert.equal(isIdentitySecurityPolicy(invalidRecoveryForRequired), false);

    // Null or non-object
    assert.equal(isIdentitySecurityPolicy(null), false);
    assert.equal(isIdentitySecurityPolicy("policy"), false);
  });

  it("validates RendererAccountSecurityState strictly against allowed keys", () => {
    const validRendererState = {
      version: 1,
      policy_status: "required",
      readiness: "ready",
      factor_category: "totp",
      factor_label: "Authenticator",
      recovery_status: "available",
      current_session: "continues_aal2",
      other_sessions: "ended",
      local_data: "retained_encrypted",
      heading_key: "security.title",
      message_key: "security.ok",
      requires_online: false,
      has_retained_data: true,
      is_reconciling: false,
    };
    assert.equal(isRendererAccountSecurityState(validRendererState), true);

    // Reject unknown extra key
    assert.equal(
      isRendererAccountSecurityState({
        ...validRendererState,
        unexpected_extra_field: "disallowed",
      }),
      false,
    );

    // Reject prohibited key (e.g. totp_seed or seed)
    assert.equal(
      isRendererAccountSecurityState({
        ...validRendererState,
        totp_seed: "secret_seed",
      }),
      false,
    );
  });

  it("validates SessionConsequence with fixed workspace_authority", () => {
    assert.equal(isSessionConsequence(VALID_SESSION_CONSEQUENCE), true);
    assert.equal(isSessionConsequence(MISSING_LOCAL_KEY_CONSEQUENCE), true);

    // workspace_authority MUST be 'must_revalidate'
    const escalatedAuthority = {
      ...VALID_SESSION_CONSEQUENCE,
      workspace_authority: "granted",
    };
    assert.equal(isSessionConsequence(escalatedAuthority), false);

    // Arbitrary next action rejected
    const invalidNextAction = {
      ...VALID_SESSION_CONSEQUENCE,
      next_action: "bypass_mfa_admin",
    };
    assert.equal(isSessionConsequence(invalidNextAction), false);
  });

  it("detects prohibited secret canaries across objects and nested structures", () => {
    assert.equal(containsProhibitedSecurityKey({ secret: "val" }), true);
    assert.equal(containsProhibitedSecurityKey({ qr_code: "svg" }), true);
    assert.equal(containsProhibitedSecurityKey({ recovery_codes: ["1", "2"] }), true);
    assert.equal(containsProhibitedSecurityKey({ password: "pass" }), true);
    assert.equal(containsProhibitedSecurityKey({ token: "jwt" }), true);
    assert.equal(containsProhibitedSecurityKey({ cookie: "c" }), true);
    assert.equal(containsProhibitedSecurityKey({ seed: "s" }), true);
    assert.equal(containsProhibitedSecurityKey({ totp_seed: "s" }), true);
    assert.equal(containsProhibitedSecurityKey({ nested: { raw_claims: "c" } }), true);

    assert.equal(
      containsProhibitedSecurityKey({
        safeField: "safe",
        nested: { count: 5, label: "label" },
      }),
      false,
    );
  });

  it("projects valid F011 evidence and rejects unknown or secret fields", () => {
    const validEvidenceInput = {
      evidence_id: "00000000-0000-4000-8000-000000000001",
      event_type: "factor_enrollment_accepted",
      outcome: "success",
      safe_reason_code: "completed_normally",
      identity_operation_reference: "00000000-0000-4000-8000-000000000002",
      policy_version: "f011_v1_synthetic",
      security_generation: 1,
      session_consequence: "continues_aal2",
      safe_diagnostic_reference: "00000000-0000-4000-8000-000000000003",
      outcome_certainty: "certain",
      authoritative_at: "2026-10-21T10:00:00.000Z",
      local_observed_at: "2026-10-21T10:00:00.000Z",
      diagnostic_id: "00000000-0000-4000-8000-000000000004",
    };

    const projected = projectIdentityEvidence(validEvidenceInput);
    assert.equal(projected.event_type, "factor_enrollment_accepted");
    assert.equal(projected.outcome, "success");
    assert.equal(projected.policy_version, "f011_v1_synthetic");
    assert.equal(projected.security_generation, 1);
    assert.equal(projected.session_consequence, "continues_aal2");

    // Reject invalid session consequence
    assert.throws(
      () =>
        projectIdentityEvidence({
          ...validEvidenceInput,
          session_consequence: "escalate_superadmin",
        }),
      /invalid_session_consequence/,
    );

    // Reject unknown fields
    assert.throws(
      () =>
        projectIdentityEvidence({
          ...validEvidenceInput,
          unknown_telemetry_data: "leak",
        }),
      /unknown_evidence_field/,
    );

    // Reject secret fields
    assert.throws(
      () =>
        projectIdentityEvidence({
          ...validEvidenceInput,
          raw_totp_code: "123456",
        }),
      /unknown_evidence_field|forbidden_sensitive_evidence_field/,
    );
  });
});
