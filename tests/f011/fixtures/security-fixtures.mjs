import {
  ACCOUNT_A,
  ACCOUNT_B,
  PROFILE_A,
  PROFILE_B,
  TEST_SECRET_PROTECTION,
  ISSUER,
} from "../../f010/fixtures/identity-fixtures.mjs";

export { ACCOUNT_A, ACCOUNT_B, PROFILE_A, PROFILE_B, TEST_SECRET_PROTECTION, ISSUER };

export const F011_CANARY_SECRETS = Object.freeze({
  rawTotpSecret: "CANARY_TOTP_SECRET_TEST_ONLY_FIXTURE",
  rawQrCode: "data:image/svg+xml;utf8,<svg>CANARY_QR_SECRET</svg>",
  rawRecoveryCodes: [
    "CANARY-CODE-1111-2222",
    "CANARY-CODE-3333-4444",
    "CANARY-CODE-5555-6666",
  ],
  rawPassword: "CANARY_SUPER_SECRET_PASSWORD_123",
  rawJwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CANARY_PAYLOAD.CANARY_SIG",
  rawClaims: JSON.stringify({ aal: "aal2", sub: "canary_user", secret: "canary" }),
  rawCookie: "sb-auth-token=canary_cookie_secret_value",
  rawProviderPayload: JSON.stringify({ internal_debug_dump: "canary_leak" }),
});

export const VALID_POLICY_SYNTHETIC = Object.freeze({
  policy_version: "f011_v1_synthetic",
  factor_requirement: "optional",
  factor_types: Object.freeze(["totp"]),
  recovery_method: "provider_recovery_codes",
  reauth_purposes: Object.freeze([
    "factor_enroll",
    "mfa_challenge",
    "recovery_codes_acknowledge",
    "recovery_codes_regenerate",
    "lost_factor_recover",
    "primary_credential_recover",
    "factor_disable",
    "factor_replace",
    "primary_credential_change",
    "recovery_identity_change",
  ]),
  attempt_policy_ref: "provider_standard_attempts_v1",
  session_consequence_profile: "standard_signout_other_sessions_v1",
  primary_recovery_profile: "password_or_magic_link_v1",
  manual_escalation_profile: "support_assisted_recovery_pending_q08",
  effective_at: "2026-10-21T00:00:00.000Z",
});

export const VALID_POLICY_REQUIRED = Object.freeze({
  ...VALID_POLICY_SYNTHETIC,
  factor_requirement: "required",
});

export const VALID_POLICY_UNAVAILABLE = Object.freeze({
  ...VALID_POLICY_SYNTHETIC,
  factor_requirement: "unavailable",
});

export const INVALID_POLICY_BOUNDS = Object.freeze({
  ...VALID_POLICY_SYNTHETIC,
  policy_version: "a".repeat(65), // 65 > max 64
});

export const MOCK_FACTOR_SUMMARY_A = Object.freeze({
  id: "factor_totp_00000000-0000-4000-8000-000000000001",
  type: "totp",
  status: "verified",
  friendly_name: "Alice Authenticator",
  created_at: "2026-10-21T10:00:00.000Z",
  updated_at: "2026-10-21T10:05:00.000Z",
});

export const PROJECTION_AAL1_A = Object.freeze({
  issuer_id: ACCOUNT_A.issuer_id,
  subject_id: ACCOUNT_A.subject_id,
  session_id: "sess_mock_00000000-0000-4000-8000-000000000001",
  current_aal: "aal1",
  next_aal: "aal1",
  factor_summaries: Object.freeze([]),
  recovery_status: "not_generated",
  provider_observed_at: "2026-10-21T10:00:00.000Z",
  capability_version: "supabase-auth-v2-totp-rc-v1",
});

export const PROJECTION_AAL2_A = Object.freeze({
  issuer_id: ACCOUNT_A.issuer_id,
  subject_id: ACCOUNT_A.subject_id,
  session_id: "sess_mock_00000000-0000-4000-8000-000000000001",
  current_aal: "aal2",
  next_aal: "aal2",
  factor_summaries: Object.freeze([MOCK_FACTOR_SUMMARY_A]),
  recovery_status: "available",
  provider_observed_at: "2026-10-21T10:06:00.000Z",
  capability_version: "supabase-auth-v2-totp-rc-v1",
});

export const VALID_SESSION_CONSEQUENCE = Object.freeze({
  current_session: "continues_aal2",
  other_sessions: "ended",
  local_data: "retained_encrypted",
  workspace_authority: "must_revalidate",
  next_action: "continue",
});

export const BILINGUAL_LABELS = Object.freeze({
  enFactorName: "Authenticator App",
  arFactorName: "تطبيق المصادقة",
  enAcknowledgePrompt: "I have securely saved these recovery codes",
  arAcknowledgePrompt: "لقد حفظت رموز الاسترداد هذه بأمان",
  enLocalKeyWarning: "Local encrypted files require the existing device unlock key",
  arLocalKeyWarning: "الملفات المشفرة محلياً تتطلب مفتاح إلغاء قفل الجهاز الحالي",
});

export const MISSING_LOCAL_KEY_CONSEQUENCE = Object.freeze({
  current_session: "continues_aal2",
  other_sessions: "unchanged",
  local_data: "current_key_unavailable",
  workspace_authority: "must_revalidate",
  next_action: "local_unlock_required",
});
