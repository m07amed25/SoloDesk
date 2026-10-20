import type { Data } from "./validation.ts";

export const ACTOR_KINDS = ["member", "service_operator"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export interface ScopedReference {
  kind: string;
  id: string;
}

export interface AcceptedEvent {
  workspace_id: string; // Tenant/order boundary
  progress_position: bigint | string; // Positive bigint, allocated transactionally
  event_id: string; // Unique public identity
  event_version: number; // Initial value 1
  event_kind: string; // Registered text 1-64
  entity_kind: string; // Scoped target reference kind
  entity_id: string; // Scoped target reference id
  accepted_revision: bigint | string; // Result revision
  operation_type: string;
  operation_id: string;
  receipt_id: string;
  audit_entry_id: string;
  actor_id?: string | null; // Optional public projection
  committed_at: string; // Authoritative instant
  occurred_at?: string | null; // Optional bounded client evidence
  projection_kind: string; // Closed schema identity
  projection_version: number; // Closed schema version
  projection: Data; // Bounded structured data; no tokens/secrets
}

export interface CommandAuditEntry {
  workspace_id: string;
  audit_entry_id: string;
  audit_version: number; // Initial value 1
  actor_kind: ActorKind;
  actor_id: string; // Stable actor/operator UUID
  operation_type: string;
  payload_version: number;
  operation_id: string;
  target_kind?: string | null;
  target_id?: string | null;
  prior_revision?: bigint | string | null;
  committed_revision?: bigint | string | null;
  occurred_at?: string | null;
  service_received_at: string;
  committed_at: string;
  reason_code?: string | null;
  safe_reason_note?: string | null;
  accepting_request_id: string;
  correlation_id: string;
  receipt_id: string;
  event_id: string;
  progress_position: bigint | string;
  summary_kind: string;
  summary_version: number;
  summary: Data; // Bounded structured projection, no raw diff
  retention_class: string;
}

export const AUDIT_ACTIONS = [
  "audit_read",
  "audit_search",
  "audit_export",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditAccessGrant {
  grant_id: string;
  workspace_id: string;
  subject_kind: ActorKind;
  subject_id: string;
  action: AuditAction;
  resource_kind?: string | null;
  resource_id?: string | null;
  purpose_code?: string | null;
  granted_by: string;
  starts_at: string;
  expires_at: string;
  revoked_at?: string | null;
  policy_version: string;
}

export interface AuditAccessEvent {
  event_id: string;
  workspace_id: string;
  operator_id: string;
  grant_id: string;
  action: AuditAction;
  purpose_code: string;
  requested_resource_kind?: string | null;
  requested_resource_id?: string | null;
  result_count: number;
  occurred_at: string;
  correlation_id: string;
  summary: Data;
}

export interface AuditQueryFilters {
  fromPosition?: bigint | string | null;
  toPosition?: bigint | string | null;
  fromTime?: string | null;
  toTime?: string | null;
  actorId?: string | null;
  operationType?: string | null;
  targetKind?: string | null;
  targetId?: string | null;
  receiptId?: string | null;
  correlationId?: string | null;
}

export interface AuditListQuery {
  workspaceId: string;
  filters?: AuditQueryFilters;
  pageSize?: number; // bounded (default 50, max 100)
  continuationToken?: string | null;
}

export interface AuditListPage {
  entries: CommandAuditEntry[];
  nextContinuationToken?: string | null;
  totalCount?: number;
}

export interface AuditGetQuery {
  workspaceId: string;
  auditEntryId: string;
}

export interface AuditCountQuery {
  workspaceId: string;
  filters?: AuditQueryFilters;
}

export interface AuditExportRequest {
  workspaceId: string;
  filters?: AuditQueryFilters;
  purposeCode: string;
}
