-- F011 Identity Security and MFA State Migration
-- Implements AccountSecurityState, IdentitySecurityOperation, and extends IdentitySecurityEvidence.
-- Enforces verbatim constraints from specs/011-mfa-account-recovery/data-model.md.

CREATE SCHEMA IF NOT EXISTS private;

-- 1. AccountSecurityState: One private server row per verified account
CREATE TABLE IF NOT EXISTS private.account_security_state (
  issuer_id text NOT NULL CHECK (char_length(issuer_id) BETWEEN 1 AND 512),
  subject_id text NOT NULL CHECK (char_length(subject_id) BETWEEN 1 AND 256),
  security_generation bigint NOT NULL DEFAULT 1 CHECK (security_generation > 0),
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 64),
  setup_state text NOT NULL CHECK (setup_state IN (
    'factor_not_configured',
    'factor_setup_required',
    'enrollment_pending',
    'recovery_codes_pending',
    'ready',
    'factor_reset_required',
    'reconciliation_required',
    'recovery_required',
    'upgrade_required'
  )),
  recovery_handoff_state text NOT NULL CHECK (recovery_handoff_state IN (
    'not_required',
    'not_generated',
    'ack_pending',
    'acknowledged',
    'rotation_unknown'
  )),
  provider_factor_reference text CHECK (
    provider_factor_reference IS NULL OR char_length(provider_factor_reference) BETWEEN 1 AND 128
  ),
  provider_capability_version text CHECK (
    provider_capability_version IS NULL OR char_length(provider_capability_version) BETWEEN 1 AND 64
  ),
  last_operation_id uuid,
  last_session_consequence text CHECK (
    last_session_consequence IS NULL OR last_session_consequence IN (
      'continues_aal2', 'continues_aal1', 'reauthentication_required', 'ended', 'unknown'
    )
  ),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (issuer_id, subject_id)
);

-- 2. IdentitySecurityOperation: Private durable operation and reconciliation ledger
CREATE TABLE IF NOT EXISTS private.identity_security_operations (
  operation_id uuid PRIMARY KEY,
  issuer_id text NOT NULL,
  subject_id text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN (
    'factor_enroll',
    'mfa_challenge',
    'recovery_codes_acknowledge',
    'recovery_codes_regenerate',
    'lost_factor_recover',
    'primary_credential_recover',
    'factor_disable',
    'factor_replace',
    'primary_credential_change',
    'recovery_identity_change'
  )),
  expected_generation bigint NOT NULL CHECK (expected_generation > 0),
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 64),
  status text NOT NULL CHECK (status IN (
    'pending',
    'provider_in_progress',
    'reconcile_required',
    'accepted',
    'rejected',
    'cancelled',
    'expired',
    'outcome_unknown'
  )),
  provider_effect text NOT NULL CHECK (provider_effect IN (
    'not_started',
    'not_observed',
    'observed_applied',
    'observed_not_applied',
    'unknown'
  )),
  safe_provider_reference text CHECK (
    safe_provider_reference IS NULL OR char_length(safe_provider_reference) BETWEEN 1 AND 128
  ),
  session_consequence text CHECK (
    session_consequence IS NULL OR session_consequence IN (
      'continues_aal2', 'continues_aal1', 'reauthentication_required', 'ended', 'unknown'
    )
  ),
  safe_reason_code text CHECK (
    safe_reason_code IS NULL OR char_length(safe_reason_code) BETWEEN 1 AND 64
  ),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CONSTRAINT check_operation_expiry CHECK (expires_at > created_at),
  CONSTRAINT check_terminal_completed_at CHECK (
    (status IN ('accepted', 'rejected', 'cancelled') AND completed_at IS NOT NULL) OR
    (status NOT IN ('accepted', 'rejected', 'cancelled'))
  ),
  FOREIGN KEY (issuer_id, subject_id)
    REFERENCES private.account_security_state (issuer_id, subject_id)
    ON DELETE RESTRICT
);

-- Indexes for identity security operations
CREATE INDEX IF NOT EXISTS idx_identity_security_ops_reconcile
  ON private.identity_security_operations (issuer_id, subject_id, status);

CREATE INDEX IF NOT EXISTS idx_identity_security_ops_expires
  ON private.identity_security_operations (expires_at);

CREATE INDEX IF NOT EXISTS idx_identity_security_ops_fk
  ON private.identity_security_operations (issuer_id, subject_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_security_ops_idempotent
  ON private.identity_security_operations (operation_id, issuer_id, subject_id, purpose, expected_generation, request_digest);

-- 3. Extend append-only evidence schema for F011
-- Preserve legacy F010 rows while adding F011 linkage and event types

-- Drop existing event_type check and replace with union of F010 and F011 events
ALTER TABLE private.identity_security_evidence
  DROP CONSTRAINT IF EXISTS identity_security_evidence_event_type_check;

ALTER TABLE private.identity_security_evidence
  ADD CONSTRAINT identity_security_evidence_event_type_check
  CHECK (event_type IN (
    'enrollment_accepted',
    'enrollment_rejected',
    'enrollment_reconciled',
    'factor_enrollment_accepted',
    'factor_enrollment_rejected',
    'mfa_challenge_verified',
    'mfa_challenge_rejected',
    'recovery_codes_acknowledged',
    'recovery_codes_regenerated',
    'account_recovery_accepted',
    'account_recovery_rejected',
    'security_change_accepted',
    'security_change_rejected',
    'security_reconciled'
  ));

-- Make enrollment_intent_reference nullable to permit F011 operations
ALTER TABLE private.identity_security_evidence
  ALTER COLUMN enrollment_intent_reference DROP NOT NULL;

-- Add F011 evidence columns
ALTER TABLE private.identity_security_evidence
  ADD COLUMN IF NOT EXISTS identity_operation_reference uuid,
  ADD COLUMN IF NOT EXISTS policy_version text CHECK (policy_version IS NULL OR char_length(policy_version) BETWEEN 1 AND 64),
  ADD COLUMN IF NOT EXISTS security_generation bigint CHECK (security_generation IS NULL OR security_generation > 0),
  ADD COLUMN IF NOT EXISTS session_consequence text CHECK (session_consequence IS NULL OR session_consequence IN (
    'continues_aal2', 'continues_aal1', 'reauthentication_required', 'ended', 'unknown'
  )),
  ADD COLUMN IF NOT EXISTS outcome_certainty text CHECK (outcome_certainty IS NULL OR outcome_certainty IN ('certain', 'uncertain'));

-- Enforce event-family linkage constraint
ALTER TABLE private.identity_security_evidence
  DROP CONSTRAINT IF EXISTS check_evidence_event_family_linkage;

ALTER TABLE private.identity_security_evidence
  ADD CONSTRAINT check_evidence_event_family_linkage
  CHECK (
    (event_type LIKE 'enrollment_%' AND enrollment_intent_reference IS NOT NULL) OR
    (event_type NOT LIKE 'enrollment_%' AND identity_operation_reference IS NOT NULL)
  );

-- Partial unique index on identity_operation_reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_evidence_operation
  ON private.identity_security_evidence (identity_operation_reference)
  WHERE identity_operation_reference IS NOT NULL;

-- Immutability trigger for identity evidence and operations
DROP TRIGGER IF EXISTS reject_account_security_state_evidence_mutation ON private.identity_security_evidence;
CREATE TRIGGER reject_account_security_state_evidence_mutation
  BEFORE UPDATE OR DELETE ON private.identity_security_evidence
  FOR EACH ROW EXECUTE FUNCTION private.reject_identity_evidence_mutation();

-- 4. Revoke and defense-in-depth RLS
REVOKE ALL ON TABLE private.account_security_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.identity_security_operations FROM PUBLIC, anon, authenticated;

ALTER TABLE private.account_security_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.identity_security_operations ENABLE ROW LEVEL SECURITY;
