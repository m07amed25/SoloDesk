import crypto from "node:crypto";

export const WORKSPACE_CONTRACT_VERSION = 1 as const;
export const WORKSPACE_PROFILE_VERSION = 1 as const;
export const SELECTION_RECORD_FORMAT_VERSION = 1 as const;

export const WORKSPACE_LIFECYCLES = Object.freeze([
  "loading",
  "no_workspace",
  "ready",
  "creating",
  "reconciling",
  "switching",
  "locked",
  "online_required",
] as const);
export type WorkspaceLifecycle = (typeof WORKSPACE_LIFECYCLES)[number];

export const WORKSPACE_STATUSES = Object.freeze([
  "active",
  "suspended",
  "closing",
  "archived",
] as const);
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

export const MEMBERSHIP_ROLES = Object.freeze([
  "owner",
  "admin",
  "member",
  "guest",
] as const);
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = Object.freeze([
  "active",
  "invited",
  "suspended",
  "revoked",
] as const);
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const READINESS_STATES = Object.freeze([
  "setup_incomplete",
  "ready",
] as const);
export type ReadinessState = (typeof READINESS_STATES)[number];

export const CREATION_INTENT_STATUSES = Object.freeze([
  "submitted",
  "committed",
  "proven_not_created",
  "rejected",
  "outcome_unknown",
] as const);
export type CreationIntentStatus = (typeof CREATION_INTENT_STATUSES)[number];

export const SELECTION_STATES = Object.freeze([
  "none",
  "current",
  "switching",
  "locked",
] as const);
export type SelectionState = (typeof SELECTION_STATES)[number];

export const PENDING_WORK_DECISIONS = Object.freeze([
  "stay",
  "save_to_source",
  "discard",
  "not_required",
] as const);
export type PendingWorkDecision = (typeof PENDING_WORK_DECISIONS)[number];

export const SELECTION_RECORD_PENDING_WORK_DECISIONS = Object.freeze([
  "not_required",
  "saved_to_source",
  "discarded",
] as const);
export type SelectionRecordPendingWorkDecision =
  (typeof SELECTION_RECORD_PENDING_WORK_DECISIONS)[number];

export const SAFE_REASON_CODES = Object.freeze([
  "pending_work_decision",
  "stale_context",
  "online_required",
  "workspace_unavailable",
  "protection_locked",
  "local_partition_missing",
  "local_partition_unreadable",
  "upgrade_required",
  "outcome_unknown",
  "recovery_required",
  "validation",
  "stale_creation_policy",
  "auth_required",
  "device_not_enrolled",
  "workspace_creation_unavailable",
  "changed_intent",
  "service_unavailable",
] as const);
export type SafeReasonCode = (typeof SAFE_REASON_CODES)[number];

export const SAFE_ACTION_CODES = Object.freeze([
  "stay",
  "save_to_source",
  "discard",
  "refresh_workspace",
  "reconnect",
  "choose_another_workspace",
  "refresh",
  "unlock",
  "retry",
  "upgrade",
  "reconcile_creation",
  "contact_support",
  "approved_recovery",
  "approved_export",
  "correct_input",
  "refresh_options",
  "sign_in_again",
  "reenroll_device",
  "retry_or_contact_support",
] as const);
export type SafeActionCode = (typeof SAFE_ACTION_CODES)[number];

export const SUPPORTED_LOCALES = Object.freeze(["en", "ar"] as const);
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const REQUIRED_PROFILE_FIELDS = Object.freeze([
  "display_name",
  "legal_name",
  "trade_name",
] as const);
export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export interface WorkspaceContextEnvelope {
  readonly profileReference: string;
  readonly profileGeneration: number;
  readonly workspaceId: string;
  readonly selectionGeneration: number;
}

export function isMatchingContextEnvelope(
  candidate: WorkspaceContextEnvelope | null | undefined,
  current: WorkspaceContextEnvelope | null | undefined,
): boolean {
  if (!candidate || !current) return false;
  return (
    candidate.profileReference === current.profileReference &&
    candidate.profileGeneration === current.profileGeneration &&
    candidate.workspaceId === current.workspaceId &&
    candidate.selectionGeneration === current.selectionGeneration
  );
}

export interface WorkspaceSummary {
  readonly workspaceId: string;
  readonly displayName: string;
  readonly discriminator: string;
  readonly role: MembershipRole;
  readonly membershipStatus: "active";
  readonly workspaceStatus: "active";
  readonly readinessState: ReadinessState;
  readonly defaultTimezone: string;
  readonly defaultCurrency: string;
  readonly defaultLocale: SupportedLocale;
  readonly profileVersion: number;
  readonly authorityVersion: number;
  readonly checkedAt: string;
}

export interface WorkspaceCreationProfile {
  readonly displayName: string;
  readonly legalName?: string;
  readonly tradeName?: string;
  readonly defaultTimezone: string;
  readonly defaultCurrency: string;
  readonly defaultLocale: SupportedLocale;
  readonly profileVersion: 1;
  readonly creationPolicyVersion: number | string;
}

export interface WorkspaceCreationRequest {
  readonly version: 1;
  readonly intentId: string;
  readonly requestDigest: string;
  readonly deviceEnrollmentId: string;
  readonly profile: WorkspaceCreationProfile;
}

export interface WorkspaceCreationPolicy {
  readonly version: number | string;
  readonly enabled: boolean;
  readonly locales: readonly SupportedLocale[];
  readonly currencyCodes: readonly string[];
  readonly timezoneCatalogue: string;
  readonly requiredProfileFields: readonly RequiredProfileField[];
  readonly boundsProfile: {
    readonly maxDisplayNameScalars: number;
    readonly maxLegalNameScalars: number;
    readonly maxTradeNameScalars: number;
  };
}

export interface WorkspaceCreationPolicySafe {
  readonly enabled: boolean;
  readonly policyVersion: number | string;
  readonly locales: readonly SupportedLocale[];
  readonly currencyCodes: readonly string[];
  readonly timezonePolicy: string;
  readonly requiredProfileFields: readonly RequiredProfileField[];
  readonly boundsProfile: {
    readonly maxDisplayNameScalars: number;
    readonly maxLegalNameScalars: number;
    readonly maxTradeNameScalars: number;
  };
}

export interface WorkspaceState {
  readonly version: 1;
  readonly lifecycle: WorkspaceLifecycle;
  readonly selectionGeneration: number;
  readonly current?: WorkspaceSummary;
  readonly target?: {
    readonly workspaceId: string;
    readonly displayName: string;
    readonly discriminator: string;
  };
  readonly selectable: readonly WorkspaceSummary[];
  readonly creation?: WorkspaceCreationPolicySafe;
  readonly messageKey?: string;
  readonly actionKey?: string;
  readonly diagnosticId?: string;
  readonly nextActions: readonly SafeActionCode[];
}

export interface ActiveWorkspaceSelection {
  readonly formatVersion: 1;
  readonly profileReference: string;
  readonly profileGeneration: number;
  readonly issuerId: string;
  readonly subjectId: string;
  readonly selectionGeneration: number;
  readonly state: SelectionState;
  readonly currentWorkspaceId?: string;
  readonly targetWorkspaceId?: string;
  readonly attemptId?: string;
  readonly correlationId?: string;
  readonly pendingWorkDecision?: SelectionRecordPendingWorkDecision;
  readonly safeReasonCode?: SafeReasonCode;
  readonly updatedAt: string;
}

export interface WorkspaceCreationCommittedResult {
  readonly status: "committed";
  readonly workspace: WorkspaceSummary;
  readonly membership: {
    readonly role: "owner";
    readonly status: "active";
  };
  readonly receiptId: string;
  readonly committedAt: string;
  readonly readinessState: "setup_incomplete";
}

export interface WorkspaceCreationRejectedResult {
  readonly status: "rejected";
  readonly code: SafeReasonCode;
  readonly fieldIssues?: readonly {
    readonly field: string;
    readonly issue: string;
  }[];
  readonly diagnosticId: string;
  readonly recovery: SafeActionCode;
}

export interface WorkspaceCreationOutcomeUnknownResult {
  readonly status: "outcome_unknown";
  readonly intentId: string;
  readonly diagnosticId: string;
  readonly recovery: "reconcile_creation";
}

export interface WorkspaceCreationProvenNotCreatedResult {
  readonly status: "proven_not_created";
  readonly intentId?: string;
  readonly recovery: "correct_input";
}

export type WorkspaceCreationResult =
  | WorkspaceCreationCommittedResult
  | WorkspaceCreationRejectedResult
  | WorkspaceCreationOutcomeUnknownResult
  | WorkspaceCreationProvenNotCreatedResult;

export interface WorkspaceSwitchResult {
  readonly success: boolean;
  readonly code?: SafeReasonCode;
  readonly recovery?: SafeActionCode;
}

// UUIDv4 validation (bare lowercase)
const UUIDV4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LEGACY_SYNTHETIC_WS_REGEX = /^ws_[0-9a-zA-Z_-]+$/;

export function isValidUuidV4(val: unknown): val is string {
  return typeof val === "string" && UUIDV4_REGEX.test(val);
}

export function isValidWorkspaceId(
  val: unknown,
  allowLegacy = false,
): val is string {
  if (typeof val !== "string") return false;
  if (UUIDV4_REGEX.test(val)) return true;
  return allowLegacy && LEGACY_SYNTHETIC_WS_REGEX.test(val);
}

export function deriveDiscriminator(workspaceId: string): string {
  if (!workspaceId || typeof workspaceId !== "string") return "0000";
  // Deterministic 4-char presentation label derived from the ID suffix
  const clean = workspaceId.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  return clean.slice(-4).padStart(4, "0");
}

// oxlint-disable-next-line eslint(no-control-regex)
/* eslint-disable-next-line no-control-regex */
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/;

export function countUnicodeScalars(str: string): number {
  return Array.from(str).length;
}

export function hasControlChars(str: string): number | boolean {
  return CONTROL_CHARS_REGEX.test(str);
}

export function validateDisplayName(name: unknown): {
  valid: boolean;
  trimmed: string;
  error?: string;
} {
  if (typeof name !== "string") {
    return { valid: false, trimmed: "", error: "must be a string" };
  }
  const trimmed = name.trim();
  const scalarCount = countUnicodeScalars(trimmed);
  if (scalarCount < 1 || scalarCount > 120) {
    return {
      valid: false,
      trimmed,
      error: "must be between 1 and 120 Unicode scalars",
    };
  }
  if (CONTROL_CHARS_REGEX.test(trimmed)) {
    return { valid: false, trimmed, error: "contains control characters" };
  }
  return { valid: true, trimmed };
}

export function validateOptionalName(
  name: unknown,
  maxScalars: number,
): { valid: boolean; value?: string; error?: string } {
  if (name === undefined || name === null || name === "") {
    return { valid: true };
  }
  if (typeof name !== "string") {
    return { valid: false, error: "must be a string" };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: true };
  }
  const scalarCount = countUnicodeScalars(trimmed);
  if (scalarCount > maxScalars) {
    return {
      valid: false,
      error: `must not exceed ${maxScalars} Unicode scalars`,
    };
  }
  if (CONTROL_CHARS_REGEX.test(trimmed)) {
    return { valid: false, error: "contains control characters" };
  }
  return { valid: true, value: trimmed };
}

function sortObjectKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function computeCreationRequestDigest(
  req: Omit<WorkspaceCreationRequest, "requestDigest">,
): string {
  const normalized = {
    version: req.version,
    intentId: req.intentId,
    deviceEnrollmentId: req.deviceEnrollmentId,
    profile: {
      displayName: req.profile.displayName.trim(),
      legalName: req.profile.legalName ? req.profile.legalName.trim() : null,
      tradeName: req.profile.tradeName ? req.profile.tradeName.trim() : null,
      defaultTimezone: req.profile.defaultTimezone,
      defaultCurrency: req.profile.defaultCurrency.toUpperCase(),
      defaultLocale: req.profile.defaultLocale,
      profileVersion: req.profile.profileVersion,
      creationPolicyVersion: String(req.profile.creationPolicyVersion),
    },
  };
  const json = JSON.stringify(sortObjectKeys(normalized));
  return `sha256-v1:${crypto.createHash("sha256").update(json, "utf8").digest("hex")}`;
}

export const PROHIBITED_AUTHORITY_KEYS = Object.freeze([
  "userId",
  "user_id",
  "accountId",
  "account_id",
  "subject",
  "subjectId",
  "role",
  "roles",
  "membership",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "key",
  "secret",
  "sql",
  "path",
  "filePath",
  "dbPath",
  "profilePath",
  "filesystem",
]);

export function rejectProhibitedAuthority(obj: Record<string, unknown>): void {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (PROHIBITED_AUTHORITY_KEYS.includes(key)) {
      throw new Error(`Forbidden authority key detected: ${key}`);
    }
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      rejectProhibitedAuthority(val as Record<string, unknown>);
    }
  }
}

export function validateExactKeys<T extends Record<string, unknown>>(
  obj: unknown,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[] = [],
): obj is T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj as Record<string, unknown>);
  for (const k of keys) {
    if (!allowedKeys.includes(k)) return false;
  }
  for (const req of requiredKeys) {
    if (!keys.includes(req)) return false;
  }
  return true;
}
