import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  IDENTITY_LIFECYCLES,
  IDENTITY_METHODS,
  IDENTITY_REASON_CODES,
  IDENTITY_ACTIONS,
  isIdentityLifecycle,
  isRendererIdentityState,
  isLocalAccountProfile,
  isProtectedSessionBinding,
  validateSafeDeviceLabel,
  containsProhibitedKey,
} from "../../../app/shared/identity-contracts.ts";
import {
  projectIdentityEvidence,
  IDENTITY_EVENT_TYPES,
  IDENTITY_OUTCOMES,
} from "../../../packages/contracts/src/identity-evidence.ts";
import {
  ACCOUNT_A,
  PROFILE_A,
  LABELS,
  PROHIBITED_SECRET_MARKERS,
} from "../fixtures/identity-fixtures.mjs";

describe("T011: Identity Contracts and Redaction", () => {
  it("enforces exact lifecycle enum closure (7 states)", () => {
    assert.equal(IDENTITY_LIFECYCLES.length, 7);
    const expected = [
      "locked",
      "signing_in",
      "enrolling",
      "enrolled",
      "sign_in_required",
      "protection_unavailable",
      "recovery_required",
    ];
    assert.deepEqual([...IDENTITY_LIFECYCLES].sort(), expected.sort());

    for (const state of expected) {
      assert.equal(isIdentityLifecycle(state), true);
    }
    assert.equal(isIdentityLifecycle("unknown"), false);
    assert.equal(isIdentityLifecycle("authenticated"), false); // must be enrolled, not generic authenticated
    assert.equal(isIdentityLifecycle(""), false);
    assert.equal(isIdentityLifecycle(null), false);
  });

  it("validates RendererIdentityState and forbids unknown or secret fields", () => {
    const validState = {
      version: 1,
      lifecycle: "enrolled",
      profileReference: PROFILE_A.profile_id,
      displayName: ACCOUNT_A.displayName,
      displayIdentifier: ACCOUNT_A.displayIdentifier,
      safeDeviceLabel: LABELS.enStandard,
      protectionStatus: "ready",
      sessionStatus: "current",
      enrollmentStatus: "enrolled",
      diagnosticId: "12345678-1234-4234-8234-123456789abc",
      messageKey: "shell.identity.enrolled",
      actionKey: "shell.identity.action.none",
      retainedWork: "none",
      nextActions: [],
    };

    assert.equal(isRendererIdentityState(validState), true);

    // Reject unknown keys
    assert.equal(
      isRendererIdentityState({ ...validState, unknownKey: "foo" }),
      false,
    );

    // Reject prohibited secret/authority fields
    for (const secretKey of [
      "token",
      "accessToken",
      "refreshToken",
      "verifier",
      "code",
      "nonce",
      "state",
      "url",
      "path",
      "profilePath",
      "deviceId",
      "workspaceId",
      "role",
      "password",
    ]) {
      assert.equal(
        isRendererIdentityState({ ...validState, [secretKey]: "leak" }),
        false,
        `Should reject prohibited key: ${secretKey}`,
      );
    }

    // Reject version !== 1
    assert.equal(isRendererIdentityState({ ...validState, version: 2 }), false);

    // Reject safeDeviceLabel > 64
    assert.equal(
      isRendererIdentityState({
        ...validState,
        safeDeviceLabel: LABELS.overflow65,
      }),
      false,
    );
  });

  it("validates LocalAccountProfile constraints verbatim", () => {
    assert.equal(isLocalAccountProfile(PROFILE_A), true);

    // Reject profile_generation < 1
    assert.equal(
      isLocalAccountProfile({ ...PROFILE_A, profile_generation: 0 }),
      false,
    );
    assert.equal(
      isLocalAccountProfile({ ...PROFILE_A, profile_generation: -1 }),
      false,
    );

    // Reject unsupported compatibility_version
    assert.equal(
      isLocalAccountProfile({ ...PROFILE_A, compatibility_version: 0 }),
      false,
    );

    // Reject mismatched issuer_id / subject_id nullability
    assert.equal(
      isLocalAccountProfile({
        ...PROFILE_A,
        issuer_id: null,
        subject_id: "usr_1",
      }),
      false,
    );
    assert.equal(
      isLocalAccountProfile({
        ...PROFILE_A,
        issuer_id: "iss_1",
        subject_id: null,
      }),
      false,
    );

    // Initial unbound profile allows both null
    assert.equal(
      isLocalAccountProfile({
        ...PROFILE_A,
        issuer_id: null,
        subject_id: null,
      }),
      true,
    );

    // Extra unknown fields rejected
    assert.equal(
      isLocalAccountProfile({ ...PROFILE_A, extra_field: 123 }),
      false,
    );
  });

  it("validates ProtectedSessionBinding data-model constraints", () => {
    const validBinding = {
      binding_id: "00000000-0000-4000-8000-000000000010",
      profile_id: PROFILE_A.profile_id,
      profile_generation: 1,
      issuer_id: ACCOUNT_A.issuer_id,
      subject_id: ACCOUNT_A.subject_id,
      credential_reference: "cred_ref_opaque_handle_123",
      session_generation: 1,
      status: "current",
      protected_write_status: "committed",
      validated_at: "2026-10-20T12:00:00.000Z",
    };

    assert.equal(isProtectedSessionBinding(validBinding), true);

    // Reject unknown status
    assert.equal(
      isProtectedSessionBinding({ ...validBinding, status: "active" }),
      false,
    );

    // Reject unknown write status
    assert.equal(
      isProtectedSessionBinding({
        ...validBinding,
        protected_write_status: "written",
      }),
      false,
    );

    // Reject non-UUID binding_id
    assert.equal(
      isProtectedSessionBinding({ ...validBinding, binding_id: "not-a-uuid" }),
      false,
    );
  });

  it("validates safeDeviceLabel bounds and character restrictions", () => {
    assert.equal(validateSafeDeviceLabel(LABELS.enStandard), LABELS.enStandard);
    assert.equal(validateSafeDeviceLabel(LABELS.arStandard), LABELS.arStandard);
    assert.equal(validateSafeDeviceLabel(LABELS.withEmoji), LABELS.withEmoji);
    assert.equal(
      validateSafeDeviceLabel(LABELS.maxAllowed64),
      LABELS.maxAllowed64,
    );

    // Overflow > 64 chars
    assert.equal(validateSafeDeviceLabel(LABELS.overflow65), null);

    // Control characters rejected
    assert.equal(validateSafeDeviceLabel(LABELS.withControlChar), null);

    // Empty / whitespace
    assert.equal(validateSafeDeviceLabel(""), null);
    assert.equal(validateSafeDeviceLabel("   "), null);
    assert.equal(validateSafeDeviceLabel(undefined), null);
    assert.equal(validateSafeDeviceLabel(null), null);
  });

  it("detects prohibited secret markers with containsProhibitedKey", () => {
    assert.equal(containsProhibitedKey({ normalKey: "value" }), false);
    assert.equal(containsProhibitedKey({ accessToken: "xyz" }), true);
    assert.equal(
      containsProhibitedKey({ nested: { codeVerifier: "abc" } }),
      true,
    );
    assert.equal(
      containsProhibitedKey({ list: [{ serviceRoleKey: "secret" }] }),
      true,
    );
  });

  it("projects and redacts identity evidence without leaking secrets", () => {
    const rawInput = {
      evidence_id: "00000000-0000-4000-8000-000000000099",
      event_type: "sign_in_completed",
      outcome: "success",
      safe_reason_code: "completed_normally",
      profile_reference: "prof_001",
      diagnostic_id: "00000000-0000-4000-8000-000000000088",
      local_observed_at: "2026-10-20T12:00:00.000Z",
    };

    const evidence = projectIdentityEvidence(rawInput);
    assert.equal(evidence.schema_version, 1);
    assert.equal(evidence.event_type, "sign_in_completed");
    assert.equal(evidence.outcome, "success");
    assert.equal(evidence.profile_reference, "prof_001");

    // Prohibited key inside raw evidence throws
    assert.throws(
      () =>
        projectIdentityEvidence({
          ...rawInput,
          token: "secret_leak",
        }),
      /forbidden_sensitive_evidence_field/,
    );

    // Invalid event_type throws
    assert.throws(
      () =>
        projectIdentityEvidence({
          ...rawInput,
          event_type: "unknown_event",
        }),
      /invalid_event_type/,
    );
  });
});
