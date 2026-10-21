export const IDENTITY_SECURITY_POLICY_VERSION = 1 as const;

export const FACTOR_REQUIREMENTS = Object.freeze([
  "unavailable",
  "optional",
  "required",
] as const);
export type FactorRequirement = (typeof FACTOR_REQUIREMENTS)[number];

export const FACTOR_TYPES = Object.freeze(["totp"] as const);
export type FactorType = (typeof FACTOR_TYPES)[number];

export const RECOVERY_METHODS = Object.freeze([
  "provider_recovery_codes",
  "none",
] as const);
export type RecoveryMethod = (typeof RECOVERY_METHODS)[number];

export const SECURITY_PURPOSES = Object.freeze([
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
] as const);
export type SecurityPurpose = (typeof SECURITY_PURPOSES)[number];

export const SECURITY_SETUP_STATES = Object.freeze([
  "factor_not_configured",
  "factor_setup_required",
  "enrollment_pending",
  "recovery_codes_pending",
  "ready",
  "factor_reset_required",
  "reconciliation_required",
  "recovery_required",
  "upgrade_required",
] as const);
export type SecuritySetupState = (typeof SECURITY_SETUP_STATES)[number];

export const RECOVERY_HANDOFF_STATES = Object.freeze([
  "not_required",
  "not_generated",
  "ack_pending",
  "acknowledged",
  "rotation_unknown",
] as const);
export type RecoveryHandoffState = (typeof RECOVERY_HANDOFF_STATES)[number];

export const OPERATION_STATUSES = Object.freeze([
  "pending",
  "provider_in_progress",
  "reconcile_required",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
  "outcome_unknown",
] as const);
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

export const PROVIDER_EFFECTS = Object.freeze([
  "not_started",
  "not_observed",
  "observed_applied",
  "observed_not_applied",
  "unknown",
] as const);
export type ProviderEffect = (typeof PROVIDER_EFFECTS)[number];

export const CURRENT_SESSION_CONSEQUENCES = Object.freeze([
  "continues_aal2",
  "continues_aal1",
  "reauthentication_required",
  "ended",
  "unknown",
] as const);
export type CurrentSessionConsequence =
  (typeof CURRENT_SESSION_CONSEQUENCES)[number];

export const OTHER_SESSIONS_CONSEQUENCES = Object.freeze([
  "unchanged",
  "ended",
  "reauthentication_required",
  "unknown",
] as const);
export type OtherSessionsConsequence =
  (typeof OTHER_SESSIONS_CONSEQUENCES)[number];

export const LOCAL_DATA_CONSEQUENCES = Object.freeze([
  "retained_encrypted",
  "current_key_available",
  "current_key_unavailable",
  "not_evaluated",
] as const);
export type LocalDataConsequence = (typeof LOCAL_DATA_CONSEQUENCES)[number];

export const WORKSPACE_AUTHORITY_CONSEQUENCE = "must_revalidate" as const;

export const RENDERER_NEXT_ACTIONS = Object.freeze([
  "continue",
  "reauthenticate",
  "sign_in",
  "enroll_factor",
  "acknowledge_recovery_codes",
  "recover_account",
  "reconcile",
  "local_unlock_required",
  "local_recovery_required",
  "contact_support",
  "none",
] as const);
export type RendererNextAction = (typeof RENDERER_NEXT_ACTIONS)[number];

export const AAL_LEVELS = Object.freeze(["aal1", "aal2"] as const);
export type AalLevel = (typeof AAL_LEVELS)[number];

export const RECOVERY_STATUSES = Object.freeze([
  "unsupported",
  "not_generated",
  "available",
  "exhausted",
  "unknown",
] as const);
export type RecoveryStatus = (typeof RECOVERY_STATUSES)[number];

export interface IdentitySecurityPolicy {
  policy_version: string;
  factor_requirement: FactorRequirement;
  factor_types: readonly ["totp"];
  recovery_method: RecoveryMethod;
  reauth_purposes: readonly SecurityPurpose[];
  attempt_policy_ref: string;
  session_consequence_profile: string;
  primary_recovery_profile: string;
  manual_escalation_profile?: string;
  effective_at: string;
}

export interface SessionConsequence {
  current_session: CurrentSessionConsequence;
  other_sessions: OtherSessionsConsequence;
  local_data: LocalDataConsequence;
  workspace_authority: typeof WORKSPACE_AUTHORITY_CONSEQUENCE;
  next_action: RendererNextAction;
}

export interface RendererAccountSecurityState {
  version: 1;
  policy_status: FactorRequirement;
  readiness: SecuritySetupState;
  factor_category?: FactorType;
  factor_label?: string;
  recovery_status: RecoveryStatus;
  current_session: CurrentSessionConsequence;
  other_sessions: OtherSessionsConsequence;
  local_data: LocalDataConsequence;
  heading_key: string;
  message_key: string;
  warning_key?: string;
  action_key?: string;
  requires_online: boolean;
  has_retained_data: boolean;
  is_reconciling: boolean;
  diagnostic_reference?: string;
}

export function isRendererAccountSecurityState(
  val: unknown,
): val is RendererAccountSecurityState {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const s = val as Record<string, unknown>;

  if (containsProhibitedSecurityKey(s)) return false;

  if (s.version !== 1) return false;
  if (!isFactorRequirement(s.policy_status)) return false;
  if (!isSecuritySetupState(s.readiness)) return false;
  if (s.factor_category !== undefined && s.factor_category !== "totp") return false;
  if (
    s.factor_label !== undefined &&
    (typeof s.factor_label !== "string" || s.factor_label.length > 128)
  ) {
    return false;
  }
  if (!isRecoveryStatus(s.recovery_status)) return false;
  if (
    typeof s.current_session !== "string" ||
    !(CURRENT_SESSION_CONSEQUENCES as readonly string[]).includes(s.current_session)
  ) {
    return false;
  }
  if (
    typeof s.other_sessions !== "string" ||
    !(OTHER_SESSIONS_CONSEQUENCES as readonly string[]).includes(s.other_sessions)
  ) {
    return false;
  }
  if (
    typeof s.local_data !== "string" ||
    !(LOCAL_DATA_CONSEQUENCES as readonly string[]).includes(s.local_data)
  ) {
    return false;
  }
  if (
    typeof s.heading_key !== "string" ||
    s.heading_key.length === 0 ||
    s.heading_key.length > 128
  ) {
    return false;
  }
  if (
    typeof s.message_key !== "string" ||
    s.message_key.length === 0 ||
    s.message_key.length > 256
  ) {
    return false;
  }
  if (
    s.warning_key !== undefined &&
    (typeof s.warning_key !== "string" || s.warning_key.length > 128)
  ) {
    return false;
  }
  if (
    s.action_key !== undefined &&
    (typeof s.action_key !== "string" || s.action_key.length > 128)
  ) {
    return false;
  }
  if (typeof s.requires_online !== "boolean") return false;
  if (typeof s.has_retained_data !== "boolean") return false;
  if (typeof s.is_reconciling !== "boolean") return false;
  if (
    s.diagnostic_reference !== undefined &&
    (typeof s.diagnostic_reference !== "string" || s.diagnostic_reference.length > 128)
  ) {
    return false;
  }

  return true;
}

export function isFactorRequirement(val: unknown): val is FactorRequirement {
  return (
    typeof val === "string" &&
    (FACTOR_REQUIREMENTS as readonly string[]).includes(val)
  );
}

export function isSecurityPurpose(val: unknown): val is SecurityPurpose {
  return (
    typeof val === "string" &&
    (SECURITY_PURPOSES as readonly string[]).includes(val)
  );
}

export function isSecuritySetupState(val: unknown): val is SecuritySetupState {
  return (
    typeof val === "string" &&
    (SECURITY_SETUP_STATES as readonly string[]).includes(val)
  );
}

export function isRecoveryHandoffState(
  val: unknown,
): val is RecoveryHandoffState {
  return (
    typeof val === "string" &&
    (RECOVERY_HANDOFF_STATES as readonly string[]).includes(val)
  );
}

export function isAalLevel(val: unknown): val is AalLevel {
  return val === "aal1" || val === "aal2";
}

export function isRecoveryStatus(val: unknown): val is RecoveryStatus {
  return (
    typeof val === "string" &&
    (RECOVERY_STATUSES as readonly string[]).includes(val)
  );
}

export function isRendererNextAction(val: unknown): val is RendererNextAction {
  return (
    typeof val === "string" &&
    (RENDERER_NEXT_ACTIONS as readonly string[]).includes(val)
  );
}

export function isSessionConsequence(val: unknown): val is SessionConsequence {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const c = val as Record<string, unknown>;

  return (
    typeof c.current_session === "string" &&
    (CURRENT_SESSION_CONSEQUENCES as readonly string[]).includes(
      c.current_session,
    ) &&
    typeof c.other_sessions === "string" &&
    (OTHER_SESSIONS_CONSEQUENCES as readonly string[]).includes(
      c.other_sessions,
    ) &&
    typeof c.local_data === "string" &&
    (LOCAL_DATA_CONSEQUENCES as readonly string[]).includes(c.local_data) &&
    c.workspace_authority === WORKSPACE_AUTHORITY_CONSEQUENCE &&
    typeof c.next_action === "string" &&
    (RENDERER_NEXT_ACTIONS as readonly string[]).includes(c.next_action)
  );
}

export function isIdentitySecurityPolicy(
  val: unknown,
): val is IdentitySecurityPolicy {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const p = val as Record<string, unknown>;

  if (
    typeof p.policy_version !== "string" ||
    p.policy_version.length === 0 ||
    p.policy_version.length > 64
  ) {
    return false;
  }
  if (!isFactorRequirement(p.factor_requirement)) {
    return false;
  }
  if (
    !Array.isArray(p.factor_types) ||
    p.factor_types.length !== 1 ||
    p.factor_types[0] !== "totp"
  ) {
    return false;
  }
  if (
    p.recovery_method !== "provider_recovery_codes" &&
    p.recovery_method !== "none"
  ) {
    return false;
  }
  if (
    !Array.isArray(p.reauth_purposes) ||
    p.reauth_purposes.some((purpose) => !isSecurityPurpose(purpose))
  ) {
    return false;
  }
  if (
    typeof p.attempt_policy_ref !== "string" ||
    p.attempt_policy_ref.length === 0 ||
    p.attempt_policy_ref.length > 64
  ) {
    return false;
  }
  if (
    typeof p.session_consequence_profile !== "string" ||
    p.session_consequence_profile.length === 0 ||
    p.session_consequence_profile.length > 64
  ) {
    return false;
  }
  if (
    typeof p.primary_recovery_profile !== "string" ||
    p.primary_recovery_profile.length === 0 ||
    p.primary_recovery_profile.length > 64
  ) {
    return false;
  }
  if (p.manual_escalation_profile !== undefined) {
    if (
      typeof p.manual_escalation_profile !== "string" ||
      p.manual_escalation_profile.length > 64
    ) {
      return false;
    }
  }
  if (
    typeof p.effective_at !== "string" ||
    Number.isNaN(Date.parse(p.effective_at))
  ) {
    return false;
  }

  return true;
}

const PROHIBITED_KEYS = [
  "secret",
  "qr_code",
  "totp_secret",
  "recovery_codes",
  "recovery_code",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "cookie",
  "raw_claims",
  "raw_claims_token",
  "raw_provider_error",
  "raw_provider_payload",
];

export function containsProhibitedSecurityKey(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (PROHIBITED_KEYS.some((prohibited) => lowerKey.includes(prohibited))) {
      return true;
    }
    if (typeof value === "object" && value !== null) {
      if (containsProhibitedSecurityKey(value)) {
        return true;
      }
    }
  }

  return false;
}
