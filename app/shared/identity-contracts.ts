import {
  type Code,
  type PublicError,
} from "../../packages/contracts/src/errors.ts";
import type { Id } from "../../packages/domain/src/ids.ts";

export const IDENTITY_VERSION = 1 as const;

export const IDENTITY_LIFECYCLES = Object.freeze([
  "locked",
  "signing_in",
  "enrolling",
  "enrolled",
  "sign_in_required",
  "protection_unavailable",
  "recovery_required",
] as const);

export type IdentityLifecycle = (typeof IDENTITY_LIFECYCLES)[number];

export const IDENTITY_METHODS = Object.freeze([
  "identity.getState",
  "identity.startSignIn",
  "identity.cancelSignIn",
  "identity.confirmEnrollment",
  "identity.retryReconciliation",
  "identity.signOut",
  "identity.confirmAccountSwitch",
] as const);

export type IdentityMethod = (typeof IDENTITY_METHODS)[number];

export const IDENTITY_REASON_CODES = Object.freeze([
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
] as const);

export type IdentityReasonCode = (typeof IDENTITY_REASON_CODES)[number];

export const IDENTITY_ACTIONS = Object.freeze([
  "retry",
  "cancel",
  "unlock_protection",
  "sign_in_again",
  "choose_isolated_profile",
  "reconcile",
  "upgrade",
  "contact_support",
] as const);

export type IdentityAction = (typeof IDENTITY_ACTIONS)[number];

export const RETAINED_WORK_STATUSES = Object.freeze([
  "none",
  "present",
  "unknown",
] as const);

export type RetainedWorkStatus = (typeof RETAINED_WORK_STATUSES)[number];

export function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
  });
}

export const SESSION_STATUSES = Object.freeze([
  "current",
  "sign_in_required",
  "rejected",
  "ended",
  "none",
] as const);

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ENROLLMENT_STATUSES = Object.freeze([
  "enrolled",
  "not_enrolled",
  "pending",
  "rejected",
] as const);

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const SESSION_BINDING_STATUSES = Object.freeze([
  "pending_commit",
  "current",
  "sign_in_required",
  "invalidated",
  "unavailable",
] as const);

export type SessionBindingStatus = (typeof SESSION_BINDING_STATUSES)[number];

export const PROTECTED_WRITE_STATUSES = Object.freeze([
  "not_started",
  "committed",
  "outcome_unknown",
  "failed",
] as const);

export type ProtectedWriteStatus = (typeof PROTECTED_WRITE_STATUSES)[number];

export type RendererIdentityState = Readonly<{
  version: 1;
  lifecycle: IdentityLifecycle;
  profileReference: string;
  displayName?: string;
  displayIdentifier?: string;
  safeDeviceLabel?: string;
  protectionStatus: "ready" | "blocked";
  sessionStatus: SessionStatus;
  enrollmentStatus: EnrollmentStatus;
  diagnosticId: string;
  messageKey: string;
  actionKey: string;
  retainedWork: RetainedWorkStatus;
  nextActions: readonly IdentityAction[];
}>;

export type LocalAccountProfile = Readonly<{
  profile_id: string; // App-generated stable opaque ID; not a renderer/provider path component
  issuer_id: string | null; // Optional until first verified binding; immutable once bound
  subject_id: string | null; // Optional until first verified binding; immutable once bound
  protection_binding_id: string; // Opaque F006/F007 reference
  profile_generation: number; // Positive monotonic value; incremented before sign-out/switch teardown
  compatibility_version: number; // Supported local profile format
  lifecycle: IdentityLifecycle;
  last_transition_at: string; // Local observation instant ISO timestamp
  safe_recovery_reason?: IdentityReasonCode;
  retained_work_status?: RetainedWorkStatus;
}>;

export type ProtectedSessionBinding = Readonly<{
  binding_id: string; // Opaque UUID
  profile_id: string;
  profile_generation: number;
  issuer_id: string;
  subject_id: string;
  credential_reference: string; // Opaque protected-store handle; never credential bytes
  session_generation: number; // Positive monotonic value
  status: SessionBindingStatus;
  protected_write_status: ProtectedWriteStatus;
  validated_at?: string;
  invalidated_at?: string;
  safe_reason_code?: IdentityReasonCode;
}>;

export type IdentityCommandRequest = Readonly<{
  version: 1;
  requestId: Id<"request">;
  method: IdentityMethod;
  payload: Readonly<Record<string, unknown>>;
}>;

export type IdentityCommandResponse =
  | Readonly<{
      version: 1;
      requestId: Id<"request">;
      status: "ok";
      data:
        | RendererIdentityState
        | Readonly<{ subscriptionId: string }>
        | Readonly<Record<string, never>>;
    }>
  | Readonly<{
      version: 1;
      requestId: Id<"request">;
      status: "error";
      error: PublicError;
    }>;

const PROHIBITED_WORDS = [
  "token",
  "verifier",
  "secret",
  "password",
  "nonce",
  "cookie",
  "servicerole",
  "service_role",
  "profilepath",
  "profile_path",
  "workspace",
  "deviceid",
  "device_id",
  "authcode",
  "auth_code",
];

const PROHIBITED_EXACT = new Set([
  "url",
  "path",
  "code",
  "state",
  "rawstate",
  "raw_state",
  "rawnonce",
  "raw_nonce",
  "role",
  "roles",
]);

export function containsProhibitedKey(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (Array.isArray(obj)) {
    return obj.some((item) => containsProhibitedKey(item));
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (PROHIBITED_EXACT.has(normalized)) return true;
    if (PROHIBITED_WORDS.some((word) => normalized.includes(word))) return true;
    if (containsProhibitedKey((obj as Record<string, unknown>)[key])) {
      return true;
    }
  }
  return false;
}

export function isIdentityLifecycle(
  value: unknown,
): value is IdentityLifecycle {
  return (
    typeof value === "string" &&
    (IDENTITY_LIFECYCLES as readonly string[]).includes(value)
  );
}

export function isRendererIdentityState(
  value: unknown,
): value is RendererIdentityState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (containsProhibitedKey(value)) return false;

  const entry = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "version",
    "lifecycle",
    "profileReference",
    "displayName",
    "displayIdentifier",
    "safeDeviceLabel",
    "protectionStatus",
    "sessionStatus",
    "enrollmentStatus",
    "diagnosticId",
    "messageKey",
    "actionKey",
    "retainedWork",
    "nextActions",
  ]);

  for (const k of Object.keys(entry)) {
    if (!allowedKeys.has(k)) return false;
  }

  if (entry.version !== 1) return false;
  if (!isIdentityLifecycle(entry.lifecycle)) return false;
  if (
    typeof entry.profileReference !== "string" ||
    entry.profileReference.length === 0 ||
    entry.profileReference.length > 128
  )
    return false;
  if (
    entry.displayName !== undefined &&
    (typeof entry.displayName !== "string" || entry.displayName.length > 128)
  )
    return false;
  if (
    entry.displayIdentifier !== undefined &&
    (typeof entry.displayIdentifier !== "string" ||
      entry.displayIdentifier.length > 256)
  )
    return false;
  if (
    entry.safeDeviceLabel !== undefined &&
    (typeof entry.safeDeviceLabel !== "string" ||
      entry.safeDeviceLabel.length > 64)
  )
    return false;
  if (
    entry.protectionStatus !== "ready" &&
    entry.protectionStatus !== "blocked"
  )
    return false;
  if (
    typeof entry.sessionStatus !== "string" ||
    !(SESSION_STATUSES as readonly string[]).includes(entry.sessionStatus)
  )
    return false;
  if (
    typeof entry.enrollmentStatus !== "string" ||
    !(ENROLLMENT_STATUSES as readonly string[]).includes(entry.enrollmentStatus)
  )
    return false;
  if (
    typeof entry.diagnosticId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(entry.diagnosticId)
  )
    return false;
  if (
    typeof entry.messageKey !== "string" ||
    entry.messageKey.length === 0 ||
    entry.messageKey.length > 128
  )
    return false;
  if (
    typeof entry.actionKey !== "string" ||
    entry.actionKey.length === 0 ||
    entry.actionKey.length > 128
  )
    return false;
  if (
    typeof entry.retainedWork !== "string" ||
    !(RETAINED_WORK_STATUSES as readonly string[]).includes(entry.retainedWork)
  )
    return false;
  if (!Array.isArray(entry.nextActions)) return false;
  for (const act of entry.nextActions) {
    if (
      typeof act !== "string" ||
      !(IDENTITY_ACTIONS as readonly string[]).includes(act)
    )
      return false;
  }

  return true;
}

export function isLocalAccountProfile(
  value: unknown,
): value is LocalAccountProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;

  const allowedKeys = new Set([
    "profile_id",
    "issuer_id",
    "subject_id",
    "protection_binding_id",
    "profile_generation",
    "compatibility_version",
    "lifecycle",
    "last_transition_at",
    "safe_recovery_reason",
    "retained_work_status",
  ]);

  for (const k of Object.keys(entry)) {
    if (!allowedKeys.has(k)) return false;
  }

  if (
    typeof entry.profile_id !== "string" ||
    entry.profile_id.length === 0 ||
    entry.profile_id.length > 128
  )
    return false;
  if (
    entry.issuer_id !== null &&
    (typeof entry.issuer_id !== "string" ||
      entry.issuer_id.length === 0 ||
      entry.issuer_id.length > 256)
  )
    return false;
  if (
    entry.subject_id !== null &&
    (typeof entry.subject_id !== "string" ||
      entry.subject_id.length === 0 ||
      entry.subject_id.length > 256)
  )
    return false;
  if ((entry.issuer_id === null) !== (entry.subject_id === null)) return false; // bound together
  if (
    typeof entry.protection_binding_id !== "string" ||
    entry.protection_binding_id.length === 0
  )
    return false;
  if (
    typeof entry.profile_generation !== "number" ||
    !Number.isInteger(entry.profile_generation) ||
    entry.profile_generation < 1
  )
    return false;
  if (
    typeof entry.compatibility_version !== "number" ||
    !Number.isInteger(entry.compatibility_version) ||
    entry.compatibility_version < 1
  )
    return false;
  if (!isIdentityLifecycle(entry.lifecycle)) return false;
  if (
    typeof entry.last_transition_at !== "string" ||
    isNaN(Date.parse(entry.last_transition_at))
  )
    return false;
  if (
    entry.safe_recovery_reason !== undefined &&
    (typeof entry.safe_recovery_reason !== "string" ||
      !(IDENTITY_REASON_CODES as readonly string[]).includes(
        entry.safe_recovery_reason,
      ))
  )
    return false;
  if (
    entry.retained_work_status !== undefined &&
    (typeof entry.retained_work_status !== "string" ||
      !(RETAINED_WORK_STATUSES as readonly string[]).includes(
        entry.retained_work_status,
      ))
  )
    return false;

  return true;
}

export function isProtectedSessionBinding(
  value: unknown,
): value is ProtectedSessionBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;

  const allowedKeys = new Set([
    "binding_id",
    "profile_id",
    "profile_generation",
    "issuer_id",
    "subject_id",
    "credential_reference",
    "session_generation",
    "status",
    "protected_write_status",
    "validated_at",
    "invalidated_at",
    "safe_reason_code",
  ]);

  for (const k of Object.keys(entry)) {
    if (!allowedKeys.has(k)) return false;
  }

  if (
    typeof entry.binding_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(entry.binding_id)
  )
    return false;
  if (typeof entry.profile_id !== "string" || entry.profile_id.length === 0)
    return false;
  if (
    typeof entry.profile_generation !== "number" ||
    !Number.isInteger(entry.profile_generation) ||
    entry.profile_generation < 1
  )
    return false;
  if (typeof entry.issuer_id !== "string" || entry.issuer_id.length === 0)
    return false;
  if (typeof entry.subject_id !== "string" || entry.subject_id.length === 0)
    return false;
  if (
    typeof entry.credential_reference !== "string" ||
    entry.credential_reference.length === 0
  )
    return false;
  if (
    typeof entry.session_generation !== "number" ||
    !Number.isInteger(entry.session_generation) ||
    entry.session_generation < 1
  )
    return false;
  if (
    typeof entry.status !== "string" ||
    !(SESSION_BINDING_STATUSES as readonly string[]).includes(entry.status)
  )
    return false;
  if (
    typeof entry.protected_write_status !== "string" ||
    !(PROTECTED_WRITE_STATUSES as readonly string[]).includes(
      entry.protected_write_status,
    )
  )
    return false;
  if (
    entry.validated_at !== undefined &&
    (typeof entry.validated_at !== "string" ||
      isNaN(Date.parse(entry.validated_at)))
  )
    return false;
  if (
    entry.invalidated_at !== undefined &&
    (typeof entry.invalidated_at !== "string" ||
      isNaN(Date.parse(entry.invalidated_at)))
  )
    return false;
  if (
    entry.safe_reason_code !== undefined &&
    (typeof entry.safe_reason_code !== "string" ||
      !(IDENTITY_REASON_CODES as readonly string[]).includes(
        entry.safe_reason_code,
      ))
  )
    return false;

  return true;
}

export function validateSafeDeviceLabel(label: unknown): string | null {
  if (label === undefined || label === null || label === "") return null;
  if (typeof label !== "string") return null;
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return null;
  if (hasControlCharacters(trimmed)) return null;
  return trimmed;
}

export function sanitizeRendererState(
  state: RendererIdentityState,
): RendererIdentityState {
  if (!isRendererIdentityState(state)) {
    throw new Error("invalid_renderer_identity_state");
  }
  return Object.freeze({
    version: 1,
    lifecycle: state.lifecycle,
    profileReference: state.profileReference,
    displayName: state.displayName,
    displayIdentifier: state.displayIdentifier,
    safeDeviceLabel: state.safeDeviceLabel,
    protectionStatus: state.protectionStatus,
    sessionStatus: state.sessionStatus,
    enrollmentStatus: state.enrollmentStatus,
    diagnosticId: state.diagnosticId,
    messageKey: state.messageKey,
    actionKey: state.actionKey,
    retainedWork: state.retainedWork,
    nextActions: Object.freeze([...state.nextActions]),
  });
}

export function isIdentityMethod(method: unknown): method is IdentityMethod {
  return (
    typeof method === "string" &&
    (IDENTITY_METHODS as readonly string[]).includes(method)
  );
}

export function validateIdentityRequest(
  method: string,
  input: unknown,
): { ok: true; value: IdentityCommandRequest } | { ok: false; code: Code } {
  if (!isIdentityMethod(method)) {
    return { ok: false, code: "VALIDATION" };
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "VALIDATION" };
  }
  if (containsProhibitedKey(input)) {
    return { ok: false, code: "VALIDATION" };
  }
  const raw = input as Record<string, unknown>;
  if (raw.version !== 1) {
    return { ok: false, code: "VALIDATION" };
  }
  if (
    !raw.requestId ||
    typeof raw.requestId !== "object" ||
    (raw.requestId as any).kind !== "request" ||
    typeof (raw.requestId as any).value !== "string"
  ) {
    return { ok: false, code: "VALIDATION" };
  }
  const payload = raw.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "VALIDATION" };
  }
  if (method === "identity.confirmEnrollment") {
    const keys = Object.keys(payload);
    for (const k of keys) {
      if (k !== "label") return { ok: false, code: "VALIDATION" };
    }
    if ("label" in payload && payload.label !== undefined) {
      if (
        typeof payload.label !== "string" ||
        validateSafeDeviceLabel(payload.label) === null
      ) {
        return { ok: false, code: "VALIDATION" };
      }
    }
  } else {
    if (Object.keys(payload).length !== 0) {
      return { ok: false, code: "VALIDATION" };
    }
  }
  return {
    ok: true,
    value: Object.freeze({
      version: 1,
      requestId: raw.requestId as Id<"request">,
      method,
      payload: Object.freeze({ ...(payload as Record<string, unknown>) }),
    }),
  };
}

export function validateIdentityResponse(
  response: unknown,
  expectedRequestId: Id<"request">,
): { ok: true; value: IdentityCommandResponse } | { ok: false } {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return { ok: false };
  }
  if (containsProhibitedKey(response)) {
    return { ok: false };
  }
  const raw = response as Record<string, unknown>;
  if (raw.version !== 1) return { ok: false };
  if (
    !raw.requestId ||
    typeof raw.requestId !== "object" ||
    (raw.requestId as any).kind !== "request" ||
    (raw.requestId as any).value !== expectedRequestId.value
  ) {
    return { ok: false };
  }
  if (raw.status === "ok") {
    if (!raw.data || typeof raw.data !== "object") return { ok: false };
    return {
      ok: true,
      value: raw as unknown as IdentityCommandResponse,
    };
  } else if (raw.status === "error") {
    if (!raw.error || typeof raw.error !== "object") return { ok: false };
    return {
      ok: true,
      value: raw as unknown as IdentityCommandResponse,
    };
  }
  return { ok: false };
}
