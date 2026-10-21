export const IDENTITY_EVIDENCE_SCHEMA_VERSION = 1 as const;

export const IDENTITY_EVENT_TYPES = Object.freeze([
  "sign_in_started",
  "sign_in_completed",
  "sign_in_failed",
  "sign_in_cancelled",
  "sign_in_expired",
  "device_enrolled",
  "enrollment_reconciled",
  "enrollment_rejected",
  "signed_out",
  "account_switched",
  "profile_recovered",
] as const);

export type IdentityEventType = (typeof IDENTITY_EVENT_TYPES)[number];

export const IDENTITY_OUTCOMES = Object.freeze([
  "success",
  "failure",
  "cancelled",
  "expired",
  "rejected",
  "unknown",
] as const);

export type IdentityOutcome = (typeof IDENTITY_OUTCOMES)[number];

export const SAFE_REASON_CODES = Object.freeze([
  "network_unavailable",
  "provider_unavailable",
  "cancelled",
  "attempt_expired",
  "invalid_return",
  "sign_in_required",
  "account_mismatch",
  "protection_unavailable",
  "enrollment_rejected",
  "outcome_unknown",
  "upgrade_required",
  "recovery_required",
  "session_invalidated",
  "completed_normally",
] as const);

export type SafeReasonCode = (typeof SAFE_REASON_CODES)[number];

/**
 * Bounded redacted append-only evidence for security-relevant terminal events.
 * Strictly excludes passwords, codes, tokens, PKCE verifiers, raw state/nonce, cookies,
 * provider payloads, unrestricted errors, URLs with query/fragment, keys, and paths.
 */
export type IdentitySecurityEvidence = Readonly<{
  evidence_id: string; // Stable UUID
  schema_version: typeof IDENTITY_EVIDENCE_SCHEMA_VERSION;
  event_type: IdentityEventType;
  outcome: IdentityOutcome;
  safe_reason_code?: SafeReasonCode;
  profile_reference?: string; // Safe opaque reference
  device_reference?: string; // Safe opaque reference
  attempt_reference?: string; // Safe opaque attempt UUID
  enrollment_intent_reference?: string; // Safe opaque intent UUID
  account_reference?: string; // Optional policy-approved pseudonymous reference
  authoritative_at?: string; // Distinguished server time
  local_observed_at: string; // Local observation instant
  correlation_id?: string;
  diagnostic_id: string;
}>;

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /password/i,
  /secret/i,
  /verifier/i,
  /code/i,
  /nonce/i,
  /state/i,
  /cookie/i,
  /path/i,
  /url/i,
  /query/i,
  /fragment/i,
  /key/i,
  /service_role/i,
];

function isSafeBoundedReference(val: unknown): val is string {
  return (
    typeof val === "string" &&
    val.length > 0 &&
    val.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(val)
  );
}

function isIsoDate(val: unknown): val is string {
  return typeof val === "string" && !isNaN(Date.parse(val));
}

/**
 * Projector that produces a strictly redacted IdentitySecurityEvidence record.
 * Throws if input contains sensitive/forbidden payload or violates invariants.
 */
export function projectIdentityEvidence(
  raw: Record<string, unknown>,
): IdentitySecurityEvidence {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("invalid_evidence_input");
  }

  // Check for any obvious leak attempts in keys
  for (const k of Object.keys(raw)) {
    if (SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(k))) {
      // Allowed reference keys:
      if (
        k !== "safe_reason_code" &&
        k !== "diagnostic_id" &&
        k !== "correlation_id"
      ) {
        throw new Error(`forbidden_sensitive_evidence_field: ${k}`);
      }
    }
  }

  if (
    typeof raw.evidence_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(raw.evidence_id)
  ) {
    throw new Error("invalid_evidence_id");
  }
  const evidence_id = raw.evidence_id;

  const event_type = raw.event_type as IdentityEventType;
  if (!IDENTITY_EVENT_TYPES.includes(event_type)) {
    throw new Error(`invalid_event_type: ${String(raw.event_type)}`);
  }

  const outcome = raw.outcome as IdentityOutcome;
  if (!IDENTITY_OUTCOMES.includes(outcome)) {
    throw new Error(`invalid_outcome: ${String(raw.outcome)}`);
  }

  const safe_reason_code =
    raw.safe_reason_code !== undefined
      ? (raw.safe_reason_code as SafeReasonCode)
      : undefined;
  if (
    safe_reason_code !== undefined &&
    !SAFE_REASON_CODES.includes(safe_reason_code)
  ) {
    throw new Error(
      `invalid_safe_reason_code: ${String(raw.safe_reason_code)}`,
    );
  }

  const profile_reference = isSafeBoundedReference(raw.profile_reference)
    ? raw.profile_reference
    : undefined;

  const device_reference = isSafeBoundedReference(raw.device_reference)
    ? raw.device_reference
    : undefined;

  const attempt_reference =
    typeof raw.attempt_reference === "string" &&
    /^[0-9a-f-]{36}$/i.test(raw.attempt_reference)
      ? raw.attempt_reference
      : undefined;

  const enrollment_intent_reference =
    typeof raw.enrollment_intent_reference === "string" &&
    /^[0-9a-f-]{36}$/i.test(raw.enrollment_intent_reference)
      ? raw.enrollment_intent_reference
      : undefined;

  const account_reference = isSafeBoundedReference(raw.account_reference)
    ? raw.account_reference
    : undefined;

  const authoritative_at = isIsoDate(raw.authoritative_at)
    ? raw.authoritative_at
    : undefined;

  const local_observed_at = isIsoDate(raw.local_observed_at)
    ? raw.local_observed_at
    : new Date().toISOString();

  const correlation_id =
    typeof raw.correlation_id === "string" &&
    /^[0-9a-f-]{36}$/i.test(raw.correlation_id)
      ? raw.correlation_id
      : undefined;

  if (
    typeof raw.diagnostic_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(raw.diagnostic_id)
  ) {
    throw new Error("invalid_diagnostic_id");
  }
  const diagnostic_id = raw.diagnostic_id;

  return Object.freeze({
    evidence_id,
    schema_version: IDENTITY_EVIDENCE_SCHEMA_VERSION,
    event_type,
    outcome,
    safe_reason_code,
    profile_reference,
    device_reference,
    attempt_reference,
    enrollment_intent_reference,
    account_reference,
    authoritative_at,
    local_observed_at,
    correlation_id,
    diagnostic_id,
  });
}
