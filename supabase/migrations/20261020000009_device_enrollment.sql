-- F010 account-scoped device enrollment. Account identity is supplied only by
-- the verified Edge Function session context; no workspace authority exists yet.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.enrollment_intents (
  issuer_id text NOT NULL CHECK (char_length(issuer_id) BETWEEN 1 AND 512),
  subject_id text NOT NULL CHECK (char_length(subject_id) BETWEEN 1 AND 256),
  enrollment_intent_id uuid NOT NULL,
  profile_reference text NOT NULL CHECK (char_length(profile_reference) BETWEEN 1 AND 128),
  profile_generation bigint NOT NULL CHECK (profile_generation > 0),
  installation_context_id text NOT NULL CHECK (char_length(installation_context_id) BETWEEN 1 AND 128),
  device_context_digest text NOT NULL CHECK (device_context_digest ~ '^[0-9a-f]{64}$'),
  device_label text CHECK (char_length(device_label) BETWEEN 1 AND 64),
  platform text NOT NULL CHECK (platform IN ('win32', 'darwin', 'linux')),
  architecture text NOT NULL CHECK (char_length(architecture) BETWEEN 1 AND 32),
  app_version text NOT NULL CHECK (char_length(app_version) BETWEEN 1 AND 64),
  protection_proof_reference text NOT NULL CHECK (char_length(protection_proof_reference) BETWEEN 1 AND 128),
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  payload_version smallint NOT NULL CHECK (payload_version = 1),
  status text NOT NULL CHECK (status IN (
    'prepared', 'submitted', 'outcome_unknown', 'service_confirmed',
    'locally_committed', 'reconciled_not_enrolled', 'rejected', 'recovery_required'
  )),
  device_enrollment_id uuid,
  receipt_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  safe_error_code text,
  diagnostic_id uuid,
  PRIMARY KEY (issuer_id, subject_id, enrollment_intent_id),
  UNIQUE (issuer_id, subject_id, enrollment_intent_id)
);

CREATE TABLE IF NOT EXISTS private.device_enrollments (
  device_enrollment_id uuid PRIMARY KEY,
  device_id uuid NOT NULL UNIQUE,
  issuer_id text NOT NULL,
  subject_id text NOT NULL,
  installation_context_id text NOT NULL,
  originating_intent_id uuid NOT NULL,
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  device_label text CHECK (char_length(device_label) BETWEEN 1 AND 64),
  platform text NOT NULL,
  architecture text NOT NULL,
  app_version text NOT NULL,
  protected_key_proof_reference text NOT NULL,
  status text NOT NULL CHECK (status IN ('enrolled', 'rejected')),
  enrolled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_contact_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  receipt_id uuid NOT NULL UNIQUE,
  evidence_id uuid NOT NULL UNIQUE,
  UNIQUE (originating_intent_id),
  UNIQUE (issuer_id, subject_id, installation_context_id),
  FOREIGN KEY (issuer_id, subject_id, originating_intent_id)
    REFERENCES private.enrollment_intents (issuer_id, subject_id, enrollment_intent_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS private.device_enrollment_receipts (
  receipt_id uuid PRIMARY KEY,
  issuer_id text NOT NULL,
  subject_id text NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  request_digest text NOT NULL,
  device_enrollment_id uuid NOT NULL,
  evidence_id uuid NOT NULL UNIQUE,
  result_status text NOT NULL CHECK (result_status = 'enrolled'),
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (issuer_id, subject_id, enrollment_intent_id),
  FOREIGN KEY (device_enrollment_id) REFERENCES private.device_enrollments(device_enrollment_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS private.identity_security_evidence (
  evidence_id uuid PRIMARY KEY,
  schema_version smallint NOT NULL CHECK (schema_version = 1),
  event_type text NOT NULL CHECK (event_type IN ('enrollment_accepted', 'enrollment_rejected', 'enrollment_reconciled')),
  outcome text NOT NULL CHECK (outcome IN ('accepted', 'rejected', 'unknown')),
  safe_reason_code text,
  profile_reference text,
  device_reference uuid,
  enrollment_intent_reference uuid NOT NULL,
  account_reference text,
  authoritative_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  local_observed_at timestamptz,
  correlation_id uuid NOT NULL,
  diagnostic_id uuid,
  UNIQUE (enrollment_intent_reference)
);

CREATE OR REPLACE FUNCTION private.reject_identity_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable identity evidence' USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS reject_device_enrollment_receipt_mutation ON private.device_enrollment_receipts;
CREATE TRIGGER reject_device_enrollment_receipt_mutation
  BEFORE UPDATE OR DELETE ON private.device_enrollment_receipts
  FOR EACH ROW EXECUTE FUNCTION private.reject_identity_evidence_mutation();

DROP TRIGGER IF EXISTS reject_identity_security_evidence_mutation ON private.identity_security_evidence;
CREATE TRIGGER reject_identity_security_evidence_mutation
  BEFORE UPDATE OR DELETE ON private.identity_security_evidence
  FOR EACH ROW EXECUTE FUNCTION private.reject_identity_evidence_mutation();

CREATE OR REPLACE FUNCTION private.enroll_device(
  p_issuer_id text,
  p_subject_id text,
  p_enrollment_intent_id uuid,
  p_profile_reference text,
  p_profile_generation bigint,
  p_installation_context_id text,
  p_device_context_digest text,
  p_device_label text,
  p_platform text,
  p_architecture text,
  p_app_version text,
  p_protection_proof_reference text,
  p_request_digest text,
  p_payload_version smallint
) RETURNS TABLE (
  status text,
  device_enrollment_id uuid,
  device_id uuid,
  receipt_id uuid
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  existing_intent private.enrollment_intents%ROWTYPE;
  new_enrollment_id uuid := pg_catalog.gen_random_uuid();
  new_device_id uuid := pg_catalog.gen_random_uuid();
  new_receipt_id uuid := pg_catalog.gen_random_uuid();
  new_evidence_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_issuer_id || E'\\000' || p_subject_id || E'\\000' || p_enrollment_intent_id::text, 0));

  SELECT * INTO existing_intent
    FROM private.enrollment_intents
   WHERE issuer_id = p_issuer_id
     AND subject_id = p_subject_id
     AND enrollment_intent_id = p_enrollment_intent_id
   FOR UPDATE;

  IF FOUND THEN
    IF existing_intent.request_digest <> p_request_digest THEN
      RAISE EXCEPTION 'changed enrollment intent' USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN QUERY
      SELECT d.status, d.device_enrollment_id, d.device_id, d.receipt_id
        FROM private.device_enrollments d
       WHERE d.issuer_id = p_issuer_id
         AND d.subject_id = p_subject_id
         AND d.originating_intent_id = p_enrollment_intent_id;
    RETURN;
  END IF;

  INSERT INTO private.enrollment_intents (
    issuer_id, subject_id, enrollment_intent_id, profile_reference,
    profile_generation, installation_context_id, device_context_digest,
    device_label, platform, architecture, app_version,
    protection_proof_reference, request_digest, payload_version, status
  ) VALUES (
    p_issuer_id, p_subject_id, p_enrollment_intent_id, p_profile_reference,
    p_profile_generation, p_installation_context_id, p_device_context_digest,
    NULLIF(p_device_label, ''), p_platform, p_architecture, p_app_version,
    p_protection_proof_reference, p_request_digest, p_payload_version, 'submitted'
  );

  INSERT INTO private.device_enrollments (
    device_enrollment_id, device_id, issuer_id, subject_id,
    installation_context_id, originating_intent_id, request_digest,
    device_label, platform, architecture, app_version,
    protected_key_proof_reference, status, receipt_id, evidence_id
  ) VALUES (
    new_enrollment_id, new_device_id, p_issuer_id, p_subject_id,
    p_installation_context_id, p_enrollment_intent_id, p_request_digest,
    NULLIF(p_device_label, ''), p_platform, p_architecture, p_app_version,
    p_protection_proof_reference, 'enrolled', new_receipt_id, new_evidence_id
  );

  INSERT INTO private.device_enrollment_receipts (
    receipt_id, issuer_id, subject_id, enrollment_intent_id, request_digest,
    device_enrollment_id, evidence_id, result_status
  ) VALUES (
    new_receipt_id, p_issuer_id, p_subject_id, p_enrollment_intent_id,
    p_request_digest, new_enrollment_id, new_evidence_id, 'enrolled'
  );

  INSERT INTO private.identity_security_evidence (
    evidence_id, schema_version, event_type, outcome, profile_reference,
    device_reference, enrollment_intent_reference, correlation_id
  ) VALUES (
    new_evidence_id, 1, 'enrollment_accepted', 'accepted', p_profile_reference,
    new_device_id, p_enrollment_intent_id, pg_catalog.gen_random_uuid()
  );

  UPDATE private.enrollment_intents
     SET status = 'service_confirmed', device_enrollment_id = new_enrollment_id,
         receipt_id = new_receipt_id, updated_at = clock_timestamp()
   WHERE issuer_id = p_issuer_id
     AND subject_id = p_subject_id
     AND enrollment_intent_id = p_enrollment_intent_id
     AND request_digest = p_request_digest;

  RETURN QUERY SELECT 'enrolled'::text, new_enrollment_id, new_device_id, new_receipt_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.get_device_enrollment_result(
  p_issuer_id text,
  p_subject_id text,
  p_enrollment_intent_id uuid
) RETURNS TABLE (
  status text,
  device_enrollment_id uuid,
  device_id uuid,
  receipt_id uuid
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT
    CASE
      WHEN enrollment.device_enrollment_id IS NOT NULL THEN 'enrolled'
      WHEN intent.status = 'reconciled_not_enrolled' THEN 'not_enrolled'
      WHEN intent.status = 'rejected' THEN 'rejected'
      ELSE 'outcome_unknown'
    END,
    enrollment.device_enrollment_id,
    enrollment.device_id,
    enrollment.receipt_id
  FROM (SELECT 1) AS singleton
  LEFT JOIN private.enrollment_intents AS intent
    ON intent.issuer_id = p_issuer_id
   AND intent.subject_id = p_subject_id
   AND intent.enrollment_intent_id = p_enrollment_intent_id
  LEFT JOIN private.device_enrollments AS enrollment
    ON enrollment.issuer_id = p_issuer_id
   AND enrollment.subject_id = p_subject_id
   AND enrollment.originating_intent_id = p_enrollment_intent_id;
$$;

CREATE INDEX IF NOT EXISTS device_enrollment_receipts_device_enrollment_idx
  ON private.device_enrollment_receipts (device_enrollment_id);

REVOKE ALL ON private.enrollment_intents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private.device_enrollments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private.device_enrollment_receipts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private.identity_security_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enroll_device(text, text, uuid, text, bigint, text, text, text, text, text, text, text, text, smallint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_device_enrollment_result(text, text, uuid) FROM PUBLIC, anon, authenticated;

ALTER TABLE private.enrollment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.device_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.device_enrollment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.identity_security_evidence ENABLE ROW LEVEL SECURITY;
