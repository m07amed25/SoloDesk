-- Migration 20261020000008_authoritative_command_receipts.sql
-- F009 Authoritative Command Receipts and Audit Evidence Schema
-- Creates private schema, evidence tables, immutability triggers, indexes, and restricted transaction/query functions.

CREATE SCHEMA IF NOT EXISTS private;

-- 1. command_operations: Permanent Operation Claim
CREATE TABLE IF NOT EXISTS private.command_operations (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  actor_id text NOT NULL,
  operation_type text NOT NULL CHECK (char_length(operation_type) BETWEEN 1 AND 64),
  operation_id text NOT NULL,
  protocol_version smallint NOT NULL DEFAULT 1,
  payload_version smallint NOT NULL DEFAULT 1,
  intent_profile text NOT NULL DEFAULT 'F003-intent-v1',
  digest_profile text NOT NULL DEFAULT 'sha256-v1',
  intent_digest text NOT NULL,
  required_device_id text,
  expected_revision bigint,
  target_kind text,
  target_id text,
  disposition text NOT NULL CHECK (disposition IN ('committed', 'job_accepted', 'rejected', 'conflict', 'proven_not_applied')),
  safe_error_code text,
  result_locator text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finalized_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  retention_class text NOT NULL DEFAULT 'default',
  archived_at timestamptz,

  PRIMARY KEY (workspace_id, actor_id, operation_type, operation_id),
  CONSTRAINT chk_disposition_result_locator CHECK (
    (disposition IN ('committed', 'job_accepted') AND result_locator IS NOT NULL) OR
    (disposition IN ('rejected', 'conflict', 'proven_not_applied') AND result_locator IS NULL)
  )
);

-- 2. command_receipts: Public Authoritative Evidence
CREATE TABLE IF NOT EXISTS private.command_receipts (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  receipt_id text PRIMARY KEY,
  actor_id text NOT NULL,
  operation_type text NOT NULL,
  operation_id text NOT NULL,
  receipt_version smallint NOT NULL DEFAULT 1,
  operation_payload_version smallint NOT NULL DEFAULT 1,
  result_status text NOT NULL CHECK (result_status IN ('authoritative_committed', 'job_accepted')),
  target_kind text,
  target_id text,
  prior_revision bigint,
  committed_revision bigint,
  service_received_at timestamptz NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  accepting_request_id text NOT NULL,
  correlation_id text NOT NULL,
  event_id text NOT NULL,
  progress_position bigint NOT NULL,
  retention_class text NOT NULL DEFAULT 'default',
  archived_at timestamptz,

  CONSTRAINT uq_receipt_workspace UNIQUE (workspace_id, receipt_id),
  CONSTRAINT uq_receipt_operation UNIQUE (workspace_id, actor_id, operation_type, operation_id)
);

-- 3. workspace_command_progress: Transactional Workspace Watermark
CREATE TABLE IF NOT EXISTS private.workspace_command_progress (
  workspace_id text PRIMARY KEY REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  last_position bigint NOT NULL DEFAULT 0 CHECK (last_position >= 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- 4. accepted_events: Authoritative Correlation Event
CREATE TABLE IF NOT EXISTS private.accepted_events (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  progress_position bigint NOT NULL CHECK (progress_position > 0),
  event_id text NOT NULL,
  event_version smallint NOT NULL DEFAULT 1,
  event_kind text NOT NULL CHECK (char_length(event_kind) BETWEEN 1 AND 64),
  entity_kind text NOT NULL,
  entity_id text NOT NULL,
  accepted_revision bigint NOT NULL DEFAULT 0 CHECK (accepted_revision >= 0),
  operation_type text NOT NULL,
  operation_id text NOT NULL,
  receipt_id text NOT NULL,
  audit_entry_id text NOT NULL,
  actor_id text,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  occurred_at timestamptz,
  projection_kind text NOT NULL,
  projection_version smallint NOT NULL DEFAULT 1,
  projection jsonb NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (workspace_id, progress_position),
  CONSTRAINT uq_event_workspace_id UNIQUE (workspace_id, event_id),
  CONSTRAINT uq_event_receipt UNIQUE (workspace_id, receipt_id),
  CONSTRAINT uq_event_audit UNIQUE (workspace_id, audit_entry_id)
);

-- 5. command_audit_entries: Append-Only Redacted Audit Evidence
CREATE TABLE IF NOT EXISTS private.command_audit_entries (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  audit_entry_id text PRIMARY KEY,
  audit_version smallint NOT NULL DEFAULT 1,
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'service_operator')),
  actor_id text NOT NULL,
  operation_type text NOT NULL,
  payload_version smallint NOT NULL DEFAULT 1,
  operation_id text NOT NULL,
  target_kind text,
  target_id text,
  prior_revision bigint,
  committed_revision bigint,
  occurred_at timestamptz,
  service_received_at timestamptz NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason_code text,
  safe_reason_note text,
  accepting_request_id text NOT NULL,
  correlation_id text NOT NULL,
  receipt_id text NOT NULL,
  event_id text NOT NULL,
  progress_position bigint NOT NULL,
  summary_kind text NOT NULL,
  summary_version smallint NOT NULL DEFAULT 1,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_class text NOT NULL DEFAULT 'default',

  CONSTRAINT uq_audit_workspace UNIQUE (workspace_id, audit_entry_id),
  CONSTRAINT uq_audit_receipt UNIQUE (workspace_id, receipt_id)
);

-- 6. audit_access_grants: Separate Audit Authority
CREATE TABLE IF NOT EXISTS private.audit_access_grants (
  grant_id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  subject_kind text NOT NULL CHECK (subject_kind IN ('member', 'service_operator')),
  subject_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('audit_read', 'audit_search', 'audit_export')),
  resource_kind text,
  resource_id text,
  purpose_code text,
  granted_by text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  policy_version text NOT NULL DEFAULT 'v1'
);

-- 7. audit_access_events: Audit of Audit Access
CREATE TABLE IF NOT EXISTS private.audit_access_events (
  event_id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  operator_id text NOT NULL,
  grant_id text NOT NULL REFERENCES private.audit_access_grants(grant_id) ON DELETE RESTRICT,
  action text NOT NULL,
  purpose_code text NOT NULL,
  requested_resource_kind text,
  requested_resource_id text,
  result_count integer NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  correlation_id text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 8. authoritative_write_state: Recovery and Migration Gate
CREATE TABLE IF NOT EXISTS private.authoritative_write_state (
  workspace_id text PRIMARY KEY REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'verification_required' CHECK (state IN ('verification_required', 'ready', 'blocked')),
  verified_schema_version text,
  verified_progress_position bigint NOT NULL DEFAULT 0,
  last_verified_at timestamptz,
  verification_manifest_digest text,
  safe_block_reason text
);

-- Indexes for F009
CREATE INDEX IF NOT EXISTS idx_command_operations_target ON private.command_operations(workspace_id, target_kind, target_id, finalized_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_receipts_lookup ON private.command_receipts(workspace_id, committed_at DESC, receipt_id);
CREATE INDEX IF NOT EXISTS idx_accepted_events_entity ON private.accepted_events(workspace_id, entity_kind, entity_id, accepted_revision);
CREATE INDEX IF NOT EXISTS idx_command_audit_time ON private.command_audit_entries(workspace_id, committed_at DESC, audit_entry_id);
CREATE INDEX IF NOT EXISTS idx_command_audit_actor ON private.command_audit_entries(workspace_id, actor_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_audit_op ON private.command_audit_entries(workspace_id, operation_type, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_audit_target ON private.command_audit_entries(workspace_id, target_kind, target_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_grants_lookup ON private.audit_access_grants(workspace_id, subject_id, action);

-- Immutability triggers to reject UPDATE / DELETE on receipts, events, audit
CREATE OR REPLACE FUNCTION private.reject_evidence_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'command_receipts' AND OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    IF (to_jsonb(OLD) - 'archived_at') = (to_jsonb(NEW) - 'archived_at') THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Immutable evidence record: UPDATE or DELETE is strictly forbidden on %', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reject_receipt_mutation ON private.command_receipts;
CREATE TRIGGER trg_reject_receipt_mutation
  BEFORE UPDATE OR DELETE ON private.command_receipts
  FOR EACH ROW EXECUTE FUNCTION private.reject_evidence_mutation();

DROP TRIGGER IF EXISTS trg_reject_event_mutation ON private.accepted_events;
CREATE TRIGGER trg_reject_event_mutation
  BEFORE UPDATE OR DELETE ON private.accepted_events
  FOR EACH ROW EXECUTE FUNCTION private.reject_evidence_mutation();

DROP TRIGGER IF EXISTS trg_reject_audit_mutation ON private.command_audit_entries;
CREATE TRIGGER trg_reject_audit_mutation
  BEFORE UPDATE OR DELETE ON private.command_audit_entries
  FOR EACH ROW EXECUTE FUNCTION private.reject_evidence_mutation();

-- Privilege lockdown: Revoke all from PUBLIC, anon, and authenticated
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- Enable RLS as defense in depth
ALTER TABLE private.command_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.command_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.workspace_command_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.accepted_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.command_audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.audit_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.audit_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.authoritative_write_state ENABLE ROW LEVEL SECURITY;
