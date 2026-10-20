import type { PublicError, Code as PublicErrorCode } from "./errors.ts";

export type OperationType = string & {
  readonly __operationType: unique symbol;
};

export function isValidOperationType(name: unknown): name is OperationType {
  if (typeof name !== "string") return false;
  if (name.length < 1 || name.length > 64) return false;
  // Match the trusted F003 registry operation-name grammar.
  return /^[a-z][a-z0-9.-]{0,63}$/.test(name);
}

export const COMMAND_DISPOSITIONS = [
  "committed",
  "job_accepted",
  "rejected",
  "conflict",
  "proven_not_applied",
] as const;

export type CommandDisposition = (typeof COMMAND_DISPOSITIONS)[number];

export const RESULT_STATUSES = [
  "authoritative_committed",
  "job_accepted",
] as const;

export type ResultStatus = (typeof RESULT_STATUSES)[number];

export interface OperationClaim {
  workspace_id: string; // canonical workspace UUID
  actor_id: string; // canonical actor UUID
  operation_type: string; // ASCII 1–64 registered operation
  operation_id: string; // canonical operation UUID
  protocol_version: number; // small integer, initial 1
  payload_version: number; // small integer, registered supported version
  intent_profile: string; // bounded text, initial 'F003-intent-v1'
  digest_profile: string; // bounded text, initial 'sha256-v1'
  intent_digest: string; // 32 bytes hex or base64
  required_device_id?: string | null; // optional canonical device UUID
  expected_revision?: bigint | string | null; // optional nonnegative bigint
  target_kind?: string | null; // non-secret resolved target type
  target_id?: string | null; // canonical resource UUID
  disposition: CommandDisposition;
  safe_error_code?: PublicErrorCode | null;
  result_locator?: string | null; // canonical receipt ID for accepted dispositions
  created_at: string; // authoritative ISO instant
  finalized_at: string; // terminal disposition ISO instant
  retention_class: string; // policy key/version
  archived_at?: string | null; // rich result archived instant
}

export interface AuthoritativeReceipt {
  workspace_id: string;
  receipt_id: string;
  actor_id: string;
  operation_type: string;
  operation_id: string;
  receipt_version: number; // initial 1
  operation_payload_version: number;
  result_status: ResultStatus;
  target_kind?: string | null;
  target_id?: string | null;
  prior_revision?: bigint | string | null;
  committed_revision?: bigint | string | null;
  service_received_at: string;
  committed_at: string;
  accepting_request_id: string;
  correlation_id: string;
  event_id: string;
  progress_position: bigint | string;
  retention_class: string;
  archived_at?: string | null;
}

export interface WorkspaceCommandProgress {
  workspace_id: string;
  last_position: bigint | string;
  updated_at: string;
}

export const AUTHORITATIVE_WRITE_STATES = [
  "verification_required",
  "ready",
  "blocked",
] as const;

export type WriteState = (typeof AUTHORITATIVE_WRITE_STATES)[number];

export interface AuthoritativeWriteState {
  workspace_id: string;
  state: WriteState;
  verified_schema_version?: string | null;
  verified_progress_position: bigint | string;
  last_verified_at?: string | null;
  verification_manifest_digest?: string | null;
  safe_block_reason?: string | null;
}

export const GATEWAY_RESULT_STATUSES = [
  "authoritative_committed",
  "job_accepted",
  "conflict",
  "rejected",
  "outcome_unknown",
] as const;

export type GatewayResultStatus = (typeof GATEWAY_RESULT_STATUSES)[number];

export const F009_ERROR_CODES = [
  "VALIDATION",
  "SCHEMA_UNSUPPORTED",
  "UPGRADE_REQUIRED",
  "AUTH_REQUIRED",
  "SESSION_REVOKED",
  "FORBIDDEN",
  "RESOURCE_UNAVAILABLE",
  "REVISION_CONFLICT",
  "OUTCOME_UNKNOWN",
] as const;

export type F009ErrorCode = (typeof F009_ERROR_CODES)[number];

export const RECONCILIATION_OUTCOMES = [
  "committed",
  "job_accepted",
  "rejected",
  "conflict",
  "proven_not_applied",
  "still_unknown",
] as const;

export type ReconciliationOutcome = (typeof RECONCILIATION_OUTCOMES)[number];

export interface ReconciliationQueryPayload {
  originalOperation: string;
  originalOperationId: string;
}

export interface ReconciliationQueryResult {
  outcome: ReconciliationOutcome;
  receipt?: AuthoritativeReceipt | null;
  safeError?: PublicError | null;
  currentRevision?: string | null;
  operationId: string;
}
