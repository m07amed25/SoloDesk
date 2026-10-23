// F013 Shared Member Invitations Contracts
// Conforms to F003 domain primitives and Constitution Principles I-VIII.

import crypto from "node:crypto";

export const INVITATION_CONTRACT_VERSION = 1 as const;

export const INVITATION_LIFECYCLES = Object.freeze([
  "pending",
  "accepted",
  "revoked",
  "expired",
  "superseded",
] as const);
export type InvitationLifecycle = (typeof INVITATION_LIFECYCLES)[number];

export const DELIVERY_OUTCOMES = Object.freeze([
  "queued",
  "provider_accepted",
  "delivered",
  "delayed",
  "failed",
  "bounced",
  "rate_limited",
  "unknown",
] as const);
export type DeliveryOutcome = (typeof DELIVERY_OUTCOMES)[number];

export const MEMBERSHIP_OUTCOMES = Object.freeze([
  "not_created",
  "active",
] as const);
export type MembershipOutcome = (typeof MEMBERSHIP_OUTCOMES)[number];

export const SAFE_ACTIONS = Object.freeze([
  "correct_input",
  "connect_and_retry",
  "refresh",
  "resend",
  "contact_owner",
  "none",
  "switch_account",
  "request_new_invitation",
  "contact_inviter",
  "try_again_later",
  "retry_original",
] as const);
export type SafeAction = (typeof SAFE_ACTIONS)[number];

export const SAFE_FAILURE_CODES = Object.freeze([
  "invalid_input",
  "online_required",
  "not_authorized",
  "policy_unavailable",
  "recipient_already_member",
  "invitation_already_pending",
  "stale_state",
  "rate_limited",
  "outcome_unknown",
  "temporarily_unavailable",
  "invitation_unavailable",
] as const);
export type SafeFailureCode = (typeof SAFE_FAILURE_CODES)[number];

export const INVITATION_BOUNDS = Object.freeze({
  maxRecipientLength: 320,
  maxOfferRefLength: 64,
  maxPageSize: 50,
  defaultPageSize: 20,
  maxCursorLength: 512,
  maxInvitationIdLength: 64,
  maxOperationIdLength: 64,
  maxLabelLength: 256,
  minRandomSecretBits: 256,
});

export type SafeInvitationFailure = Readonly<{
  ok: false;
  code: SafeFailureCode;
  action: SafeAction;
  correlationId?: string;
  field?: "recipient" | "offer";
}>;

export type SafeInvitationSummary = Readonly<{
  invitationId: string;
  revision: number;
  recipientLabel: string;
  offerRef: string;
  roleLabelKey: string;
  scopeLabelKey: string;
  lifecycle: InvitationLifecycle;
  expiresAt: string;
  deliveryOutcome: DeliveryOutcome;
  membershipOutcome: MembershipOutcome;
  availableActions: readonly ("resend" | "revoke" | "refresh")[];
  updatedAt: string;
}>;

export type GetInvitationPolicyResult =
  | Readonly<{
      ok: true;
      policyRevision: number;
      recipientInput: { kind: "email"; maxLength: number };
      offers: readonly Readonly<{
        offerRef: string;
        roleLabelKey: string;
        scopeLabelKey: string;
        consequenceLabelKey: string;
      }>[];
      expiryLabelKey: string;
      canInvite: boolean;
    }>
  | SafeInvitationFailure;

export type ListInvitationsInput = Readonly<{
  cursor?: string;
  pageSize: number;
}>;

export type ListInvitationsResult =
  | Readonly<{
      ok: true;
      items: readonly SafeInvitationSummary[];
      nextCursor?: string;
      policyRevision: number;
    }>
  | SafeInvitationFailure;

export type CreateInvitationInput = Readonly<{
  operationId: string;
  recipient: { kind: "email"; value: string };
  offerRef: string;
  policyRevision: number;
}>;

export type CreateInvitationResult =
  | Readonly<{
      ok: true;
      effect: "created" | "replayed";
      invitation: SafeInvitationSummary;
    }>
  | SafeInvitationFailure;

export type ResendInvitationInput = Readonly<{
  operationId: string;
  invitationId: string;
  expectedRevision: number;
}>;

export type ResendInvitationResult =
  | Readonly<{
      ok: true;
      effect: "resent" | "replayed";
      invitation: SafeInvitationSummary;
    }>
  | SafeInvitationFailure;

export type RevokeInvitationInput = Readonly<{
  operationId: string;
  invitationId: string;
  expectedRevision: number;
}>;

export type RevokeInvitationResult =
  | Readonly<{
      ok: true;
      effect: "revoked" | "replayed";
      invitation: SafeInvitationSummary;
    }>
  | SafeInvitationFailure;

export type ReconcileInvitationInput = Readonly<{
  operationId: string;
}>;

export type ReconcileInvitationResult =
  | Readonly<{
      ok: true;
      outcome: "committed" | "not_committed" | "still_processing";
      invitation?: SafeInvitationSummary;
    }>
  | SafeInvitationFailure;

// Hosted Browser Redemption Types
export type HostedExchangeInput = Readonly<{
  selector: string;
  secret: string;
}>;

export type HostedExchangeResult =
  | Readonly<{
      state: "continue";
      next: "sign_in" | "review";
    }>
  | Readonly<{
      state: "unavailable";
      action: "request_new_invitation" | "try_again_later";
    }>;

export type HostedInvitationReview =
  | Readonly<{
      state: "review";
      invitationRef: string;
      workspaceLabel: string;
      inviterLabel?: string;
      roleLabelKey: string;
      scopeLabelKey: string;
      consequenceLabelKey: string;
      expiresAt: string;
      revision: number;
    }>
  | Readonly<{
      state: "unavailable";
      action:
        | "switch_account"
        | "request_new_invitation"
        | "contact_inviter"
        | "try_again_later";
    }>;

export type HostedAcceptInvitationInput = Readonly<{
  operationId: string;
  invitationRef: string;
  expectedRevision: number;
  confirmed: true;
}>;

export type HostedAcceptInvitationResult =
  | Readonly<{
      ok: true;
      effect: "accepted" | "replayed";
      membershipRef: string;
      workspaceLabel: string;
      roleLabelKey: string;
      scopeLabelKey: string;
    }>
  | Readonly<{
      ok: false;
      code:
        | "invitation_unavailable"
        | "online_required"
        | "outcome_unknown"
        | "temporarily_unavailable";
      action:
        | "switch_account"
        | "request_new_invitation"
        | "retry_original"
        | "try_again_later";
      correlationId?: string;
    }>;

// Canonical UUIDv4 validation helper
export function isCanonicalUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value,
  );
}

// Bounded email normalization and validation
export function normalizeAndValidateRecipientEmail(
  value: unknown,
): { ok: true; email: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "recipient_must_be_string" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "recipient_empty" };
  }
  if (trimmed.length > INVITATION_BOUNDS.maxRecipientLength) {
    return { ok: false, reason: "recipient_too_long" };
  }
  // Disallow ASCII control characters, newlines, null bytes
  // oxlint-disable-next-line eslint(no-control-regex)
  /* eslint-disable-next-line no-control-regex */
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { ok: false, reason: "recipient_contains_control_characters" };
  }
  // Standard permissive but safe email validation without internal spaces
  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "recipient_invalid_format" };
  }
  const [localPart, domainPart] = parts;
  if (localPart.length > 64 || domainPart.length > 255) {
    return { ok: false, reason: "recipient_domain_or_local_too_long" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, reason: "recipient_invalid_format" };
  }
  return { ok: true, email: trimmed.toLowerCase() };
}

// Deterministic semantic digest for F009 command idempotency
export function computeInvitationOperationDigest(
  commandType: "create" | "resend" | "revoke" | "accept",
  payload: Record<string, unknown>,
): string {
  // Extract only approved semantic fields and sort them deterministically
  const canonicalEntries = Object.entries(payload)
    .filter(([k, v]) => v !== undefined && k !== "operationId")
    .sort(([a], [b]) => a.localeCompare(b));

  const normalized = JSON.stringify({
    version: INVITATION_CONTRACT_VERSION,
    commandType,
    payload: Object.fromEntries(canonicalEntries),
  });

  return crypto
    .createHash("sha256")
    .update(`solodesk:f013:operation:${normalized}`)
    .digest("hex");
}

export function createSafeInvitationFailure(
  code: SafeFailureCode,
  action: SafeAction,
  options?: { correlationId?: string; field?: "recipient" | "offer" },
): SafeInvitationFailure {
  const result: {
    ok: false;
    code: SafeFailureCode;
    action: SafeAction;
    correlationId?: string;
    field?: "recipient" | "offer";
  } = {
    ok: false,
    code,
    action,
  };
  if (options?.correlationId) result.correlationId = options.correlationId;
  if (options?.field) result.field = options.field;
  return Object.freeze(result);
}

// Bounded runtime validator for CreateInvitationInput
export function validateCreateInvitationInput(
  raw: unknown,
  allowedOffers?: readonly string[],
):
  | { ok: true; input: CreateInvitationInput }
  | {
      ok: false;
      code: SafeFailureCode;
      reason: string;
      field?: "recipient" | "offer";
    } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, code: "invalid_input", reason: "input_must_be_object" };
  }
  const obj = raw as Record<string, unknown>;

  // Reject caller authority injection attempts
  const prohibitedKeys = [
    "actorId",
    "workspaceId",
    "role",
    "scope",
    "expiresAt",
    "token",
    "secret",
    "authority",
    "status",
  ];
  for (const key of prohibitedKeys) {
    if (key in obj) {
      return {
        ok: false,
        code: "invalid_input",
        reason: `caller_authority_injection_prohibited_${key}`,
      };
    }
  }

  // Exact-key check: no unknown fields
  const allowedKeys = new Set([
    "operationId",
    "recipient",
    "offerRef",
    "policyRevision",
  ]);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return {
        ok: false,
        code: "invalid_input",
        reason: `unknown_field_${key}`,
      };
    }
  }

  // Validate operationId
  if (
    typeof obj.operationId !== "string" ||
    !isCanonicalUuid(obj.operationId)
  ) {
    return { ok: false, code: "invalid_input", reason: "invalid_operation_id" };
  }

  // Validate recipient
  if (
    !obj.recipient ||
    typeof obj.recipient !== "object" ||
    (obj.recipient as any).kind !== "email"
  ) {
    return {
      ok: false,
      code: "invalid_input",
      reason: "invalid_recipient_kind",
      field: "recipient",
    };
  }
  const emailValidation = normalizeAndValidateRecipientEmail(
    (obj.recipient as any).value,
  );
  if (!emailValidation.ok) {
    return {
      ok: false,
      code: "invalid_input",
      reason: emailValidation.reason,
      field: "recipient",
    };
  }

  // Validate offerRef
  if (
    typeof obj.offerRef !== "string" ||
    obj.offerRef.length === 0 ||
    obj.offerRef.length > INVITATION_BOUNDS.maxOfferRefLength
  ) {
    return {
      ok: false,
      code: "invalid_input",
      reason: "invalid_offer_ref",
      field: "offer",
    };
  }
  if (allowedOffers && !allowedOffers.includes(obj.offerRef)) {
    return {
      ok: false,
      code: "policy_unavailable",
      reason: "unapproved_offer_ref",
      field: "offer",
    };
  }

  // Validate policyRevision
  if (
    typeof obj.policyRevision !== "number" ||
    !Number.isInteger(obj.policyRevision) ||
    obj.policyRevision < 1
  ) {
    return {
      ok: false,
      code: "invalid_input",
      reason: "invalid_policy_revision",
    };
  }

  return {
    ok: true,
    input: Object.freeze({
      operationId: obj.operationId,
      recipient: Object.freeze({ kind: "email", value: emailValidation.email }),
      offerRef: obj.offerRef,
      policyRevision: obj.policyRevision,
    }),
  };
}

export interface CursorParams {
  workspaceId: string;
  createdAt: string;
  invitationId: string;
  expiresAt: string;
}

export function encodeCursor(params: CursorParams): string {
  const json = JSON.stringify({
    w: params.workspaceId,
    c: params.createdAt,
    i: params.invitationId,
    e: params.expiresAt,
  });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(
  cursor: string,
  expectedWorkspaceId: string,
):
  | { ok: true; createdAt: string; invitationId: string }
  | { ok: false; reason: string } {
  try {
    if (
      !cursor ||
      typeof cursor !== "string" ||
      cursor.length > INVITATION_BOUNDS.maxCursorLength
    ) {
      return { ok: false, reason: "invalid_cursor_length" };
    }
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, reason: "invalid_cursor_format" };
    }
    if (parsed.w !== expectedWorkspaceId) {
      return { ok: false, reason: "workspace_mismatch" };
    }
    if (typeof parsed.e === "string" && Date.parse(parsed.e) < Date.now()) {
      return { ok: false, reason: "cursor_expired" };
    }
    if (typeof parsed.c !== "string" || typeof parsed.i !== "string") {
      return { ok: false, reason: "invalid_cursor_payload" };
    }
    return { ok: true, createdAt: parsed.c, invitationId: parsed.i };
  } catch {
    return { ok: false, reason: "cursor_decode_failed" };
  }
}
