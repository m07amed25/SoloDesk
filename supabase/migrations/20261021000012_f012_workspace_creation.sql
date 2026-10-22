-- Migration 20261021000012_f012_workspace_creation.sql
-- F012 Workspace Creation and Safe Switching Schema, Policies, and RPCs

-- 1. Extend public.workspace_tenants
ALTER TABLE public.workspace_tenants
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS profile_version integer NOT NULL DEFAULT 1 CHECK (profile_version > 0),
  ADD COLUMN IF NOT EXISTS creation_policy_version text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS readiness_state text NOT NULL DEFAULT 'setup_incomplete'
    CHECK (readiness_state IN ('setup_incomplete', 'ready'));

-- Backfill display_name for existing rows before adding constraints
UPDATE public.workspace_tenants
   SET display_name = COALESCE(NULLIF(TRIM(trade_name), ''), NULLIF(TRIM(legal_name), ''), 'Workspace')
 WHERE display_name IS NULL;

ALTER TABLE public.workspace_tenants
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN legal_name DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_workspace_tenants_display_name'
  ) THEN
    ALTER TABLE public.workspace_tenants
      ADD CONSTRAINT chk_workspace_tenants_display_name
      CHECK (char_length(display_name) BETWEEN 1 AND 120 AND display_name !~ '[[:cntrl:]]');
  END IF;
END $$;

-- 2. Verify or add index on workspace_memberships (user_id, status)
CREATE INDEX IF NOT EXISTS idx_memberships_user_status_f012
  ON public.workspace_memberships (user_id, status);

-- 3. Versioned Creation Policy table in private schema
CREATE TABLE IF NOT EXISTS private.workspace_creation_policies (
  version text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  locales text[] NOT NULL DEFAULT ARRAY['en', 'ar'],
  currency_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  timezone_catalogue text NOT NULL DEFAULT 'IANA',
  required_profile_fields text[] NOT NULL DEFAULT ARRAY['display_name'],
  bounds_profile jsonb NOT NULL DEFAULT '{"maxDisplayNameScalars":120,"maxLegalNameScalars":200,"maxTradeNameScalars":120}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

REVOKE ALL ON TABLE private.workspace_creation_policies FROM PUBLIC, anon, authenticated;

-- 4. Private Account-Scoped Creation Intent / Result relation
CREATE TABLE IF NOT EXISTS private.workspace_creation_intents (
  issuer_id text NOT NULL,
  subject_id text NOT NULL,
  intent_id uuid NOT NULL,
  operation_type text NOT NULL DEFAULT 'workspace.create' CHECK (operation_type = 'workspace.create'),
  request_digest text NOT NULL,
  payload_version smallint NOT NULL DEFAULT 1 CHECK (payload_version = 1),
  creation_policy_version text NOT NULL,
  device_enrollment_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted', 'committed', 'proven_not_created', 'rejected', 'outcome_unknown')),
  workspace_id text,
  receipt_id uuid,
  safe_error_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finalized_at timestamptz,
  PRIMARY KEY (issuer_id, subject_id, operation_type, intent_id)
);

REVOKE ALL ON TABLE private.workspace_creation_intents FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_workspace_creation_intents_lookup
  ON private.workspace_creation_intents (issuer_id, subject_id, intent_id);

-- 5. Helper to verify caller enrollment
CREATE OR REPLACE FUNCTION private.verify_caller_device_enrollment(
  p_issuer_id text,
  p_subject_id text,
  p_device_enrollment_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM private.device_enrollments
     WHERE device_enrollment_id = p_device_enrollment_id
       AND issuer_id = p_issuer_id
       AND subject_id = p_subject_id
       AND status = 'enrolled'
  );
END;
$$;
REVOKE ALL ON FUNCTION private.verify_caller_device_enrollment(text, text, uuid) FROM PUBLIC, anon, authenticated;

-- 6. RPC: Bootstrap workspace state and policy
CREATE OR REPLACE FUNCTION public.solodesk_workspace_bootstrap()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_account record;
  v_policy record;
  v_workspaces jsonb := '[]'::jsonb;
  v_creation jsonb;
BEGIN
  SELECT * INTO STRICT v_account FROM private.current_identity_account();

  -- Active policy
  SELECT * INTO v_policy
    FROM private.workspace_creation_policies
   WHERE enabled = true
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    v_creation := jsonb_build_object(
      'enabled', true,
      'policyVersion', v_policy.version,
      'locales', to_jsonb(v_policy.locales),
      'currencyCodes', to_jsonb(v_policy.currency_codes),
      'timezonePolicy', v_policy.timezone_catalogue,
      'requiredProfileFields', to_jsonb(v_policy.required_profile_fields),
      'boundsProfile', v_policy.bounds_profile
    );
  ELSE
    v_creation := jsonb_build_object(
      'enabled', false,
      'policyVersion', 'none',
      'locales', '["en","ar"]'::jsonb,
      'currencyCodes', '[]'::jsonb,
      'timezonePolicy', 'UTC',
      'requiredProfileFields', '["display_name"]'::jsonb,
      'boundsProfile', '{"maxDisplayNameScalars":120,"maxLegalNameScalars":200,"maxTradeNameScalars":120}'::jsonb
    );
  END IF;

  -- Selectable workspaces for caller
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'workspaceId', wt.id,
      'displayName', wt.display_name,
      'discriminator', right(replace(wt.id, '-', ''), 4),
      'role', wm.role,
      'membershipStatus', wm.status,
      'workspaceStatus', wt.status,
      'readinessState', wt.readiness_state,
      'defaultTimezone', wt.default_timezone,
      'defaultCurrency', wt.default_currency,
      'defaultLocale', wt.default_locale,
      'profileVersion', wt.profile_version,
      'authorityVersion', 1,
      'checkedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) ORDER BY wt.created_at ASC
  ), '[]'::jsonb) INTO v_workspaces
    FROM public.workspace_memberships wm
    JOIN public.workspace_tenants wt ON wt.id = wm.workspace_id
   WHERE wm.user_id = v_account.subject_id
     AND wm.status = 'active'
     AND wt.status = 'active';

  RETURN jsonb_build_object(
    'version', 1,
    'creation', v_creation,
    'workspaces', v_workspaces
  );
END;
$$;
REVOKE ALL ON FUNCTION public.solodesk_workspace_bootstrap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solodesk_workspace_bootstrap() TO authenticated;

-- 7. RPC: Create Workspace
CREATE OR REPLACE FUNCTION public.solodesk_create_workspace(p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_account record;
  v_policy record;
  v_intent record;
  v_intent_id uuid;
  v_device_enrollment_id uuid;
  v_workspace_id text;
  v_receipt_id uuid;
  v_audit_id text;
  v_display_name text;
  v_legal_name text;
  v_trade_name text;
  v_timezone text;
  v_currency text;
  v_locale text;
  v_policy_version text;
  v_request_digest text;
  v_payload_version smallint;
  v_computed_digest text;
  v_now timestamptz := clock_timestamp();
  v_summary jsonb;
BEGIN
  SELECT * INTO STRICT v_account FROM private.current_identity_account();

  -- Validate request shape
  IF jsonb_typeof(p_request) <> 'object' OR pg_column_size(p_request) > 8192
     OR NOT p_request ?& ARRAY['version', 'intentId', 'requestDigest', 'deviceEnrollmentId', 'profile']
     OR COALESCE(p_request->>'version', '') <> '1'
     OR jsonb_typeof(p_request->'profile') <> 'object' THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'code', 'validation',
      'diagnosticId', gen_random_uuid()::text,
      'recovery', 'correct_input'
    );
  END IF;

  v_intent_id := (p_request->>'intentId')::uuid;
  v_device_enrollment_id := (p_request->>'deviceEnrollmentId')::uuid;
  v_request_digest := p_request->>'requestDigest';

  -- Check existing intent claim under unique lock
  SELECT * INTO v_intent
    FROM private.workspace_creation_intents
   WHERE issuer_id = v_account.issuer_id
     AND subject_id = v_account.subject_id
     AND operation_type = 'workspace.create'
     AND intent_id = v_intent_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_intent.request_digest <> v_request_digest THEN
      RETURN jsonb_build_object(
        'status', 'rejected',
        'code', 'changed_intent',
        'diagnosticId', gen_random_uuid()::text,
        'recovery', 'reconcile_creation'
      );
    END IF;

    IF v_intent.status = 'committed' THEN
      SELECT jsonb_build_object(
        'workspaceId', wt.id,
        'displayName', wt.display_name,
        'discriminator', right(replace(wt.id, '-', ''), 4),
        'role', 'owner',
        'membershipStatus', 'active',
        'workspaceStatus', wt.status,
        'readinessState', wt.readiness_state,
        'defaultTimezone', wt.default_timezone,
        'defaultCurrency', wt.default_currency,
        'defaultLocale', wt.default_locale,
        'profileVersion', wt.profile_version,
        'authorityVersion', 1,
        'checkedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) INTO v_summary
        FROM public.workspace_tenants wt
       WHERE wt.id = v_intent.workspace_id;

      RETURN jsonb_build_object(
        'status', 'committed',
        'workspace', v_summary,
        'membership', jsonb_build_object('role', 'owner', 'status', 'active'),
        'receiptId', v_intent.receipt_id::text,
        'committedAt', to_char(v_intent.finalized_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'readinessState', 'setup_incomplete'
      );
    ELSIF v_intent.status = 'rejected' THEN
      RETURN jsonb_build_object(
        'status', 'rejected',
        'code', COALESCE(v_intent.safe_error_code, 'workspace_creation_unavailable'),
        'diagnosticId', gen_random_uuid()::text,
        'recovery', 'retry'
      );
    ELSE
      RETURN jsonb_build_object(
        'status', 'outcome_unknown',
        'intentId', v_intent_id::text,
        'diagnosticId', gen_random_uuid()::text,
        'recovery', 'reconcile_creation'
      );
    END IF;
  END IF;

  -- Verify device enrollment
  IF NOT private.verify_caller_device_enrollment(v_account.issuer_id, v_account.subject_id, v_device_enrollment_id) THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'code', 'device_not_enrolled',
      'diagnosticId', gen_random_uuid()::text,
      'recovery', 'reenroll_device'
    );
  END IF;

  -- Load and verify policy
  v_policy_version := p_request->'profile'->>'creationPolicyVersion';
  SELECT * INTO v_policy
    FROM private.workspace_creation_policies
   WHERE version = v_policy_version
     AND enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'code', 'stale_creation_policy',
      'diagnosticId', gen_random_uuid()::text,
      'recovery', 'refresh_options'
    );
  END IF;

  -- Validate profile inputs
  v_display_name := trim(p_request->'profile'->>'displayName');
  v_legal_name := NULLIF(trim(p_request->'profile'->>'legalName'), '');
  v_trade_name := NULLIF(trim(p_request->'profile'->>'tradeName'), '');
  v_timezone := p_request->'profile'->>'defaultTimezone';
  v_currency := upper(p_request->'profile'->>'defaultCurrency');
  v_locale := p_request->'profile'->>'defaultLocale';

  IF char_length(v_display_name) NOT BETWEEN 1 AND 120 OR v_display_name ~ '[[:cntrl:]]'
     OR (v_legal_name IS NOT NULL AND (char_length(v_legal_name) NOT BETWEEN 1 AND 200 OR v_legal_name ~ '[[:cntrl:]]'))
     OR (v_trade_name IS NOT NULL AND (char_length(v_trade_name) NOT BETWEEN 1 AND 120 OR v_trade_name ~ '[[:cntrl:]]'))
     OR NOT (v_locale = ANY(v_policy.locales))
     OR NOT (v_currency = ANY(v_policy.currency_codes)) THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'code', 'validation',
      'diagnosticId', gen_random_uuid()::text,
      'recovery', 'correct_input'
    );
  END IF;

  -- Claim intent
  INSERT INTO private.workspace_creation_intents (
    issuer_id, subject_id, intent_id, operation_type, request_digest,
    payload_version, creation_policy_version, device_enrollment_id,
    status, created_at
  ) VALUES (
    v_account.issuer_id, v_account.subject_id, v_intent_id, 'workspace.create',
    v_request_digest, 1, v_policy_version, v_device_enrollment_id,
    'submitted', v_now
  );

  -- Generate canonical lowercase UUIDv4 for workspace and receipt
  v_workspace_id := lower(gen_random_uuid()::text);
  v_receipt_id := gen_random_uuid();
  v_audit_id := 'aud_' || lower(replace(gen_random_uuid()::text, '-', ''));

  -- Insert Workspace Tenant
  INSERT INTO public.workspace_tenants (
    id, display_name, legal_name, trade_name, default_timezone,
    default_currency, default_locale, profile_version, creation_policy_version,
    readiness_state, status, created_at, updated_at
  ) VALUES (
    v_workspace_id, v_display_name, v_legal_name, v_trade_name, v_timezone,
    v_currency, v_locale, 1, v_policy_version,
    'setup_incomplete', 'active', v_now, v_now
  );

  -- Insert Creator Membership (sole active Owner)
  INSERT INTO public.workspace_memberships (
    workspace_id, user_id, role, status, granted_by, created_at, updated_at
  ) VALUES (
    v_workspace_id, v_account.subject_id, 'owner', 'active', v_account.subject_id, v_now, v_now
  );

  -- Insert Redacted Audit Event
  INSERT INTO public.tenant_audit_events (
    id, workspace_id, actor_id, action_type, target_resource_type,
    target_resource_id, change_diff, correlation_id, occurred_at
  ) VALUES (
    v_audit_id, v_workspace_id, v_account.subject_id, 'workspace_created',
    'workspace', v_workspace_id,
    jsonb_build_object(
      'policyVersion', v_policy_version,
      'profileVersion', 1,
      'readinessState', 'setup_incomplete',
      'defaultLocale', v_locale,
      'defaultCurrency', v_currency
    ),
    v_receipt_id::text, v_now
  );

  -- Finalize intent
  UPDATE private.workspace_creation_intents
     SET status = 'committed',
         workspace_id = v_workspace_id,
         receipt_id = v_receipt_id,
         finalized_at = v_now
   WHERE issuer_id = v_account.issuer_id
     AND subject_id = v_account.subject_id
     AND operation_type = 'workspace.create'
     AND intent_id = v_intent_id;

  v_summary := jsonb_build_object(
    'workspaceId', v_workspace_id,
    'displayName', v_display_name,
    'discriminator', right(replace(v_workspace_id, '-', ''), 4),
    'role', 'owner',
    'membershipStatus', 'active',
    'workspaceStatus', 'active',
    'readinessState', 'setup_incomplete',
    'defaultTimezone', v_timezone,
    'defaultCurrency', v_currency,
    'defaultLocale', v_locale,
    'profileVersion', 1,
    'authorityVersion', 1,
    'checkedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  RETURN jsonb_build_object(
    'status', 'committed',
    'workspace', v_summary,
    'membership', jsonb_build_object('role', 'owner', 'status', 'active'),
    'receiptId', v_receipt_id::text,
    'committedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'readinessState', 'setup_incomplete'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.solodesk_create_workspace(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solodesk_create_workspace(jsonb) TO authenticated;

-- 8. RPC: Reconcile Workspace Creation
CREATE OR REPLACE FUNCTION public.solodesk_reconcile_workspace_creation(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_account record;
  v_intent record;
  v_summary jsonb;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO STRICT v_account FROM private.current_identity_account();

  SELECT * INTO v_intent
    FROM private.workspace_creation_intents
   WHERE issuer_id = v_account.issuer_id
     AND subject_id = v_account.subject_id
     AND operation_type = 'workspace.create'
     AND intent_id = p_intent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'proven_not_created',
      'intentId', p_intent_id::text
    );
  END IF;

  IF v_intent.status = 'committed' THEN
    SELECT jsonb_build_object(
      'workspaceId', wt.id,
      'displayName', wt.display_name,
      'discriminator', right(replace(wt.id, '-', ''), 4),
      'role', 'owner',
      'membershipStatus', 'active',
      'workspaceStatus', wt.status,
      'readinessState', wt.readiness_state,
      'defaultTimezone', wt.default_timezone,
      'defaultCurrency', wt.default_currency,
      'defaultLocale', wt.default_locale,
      'profileVersion', wt.profile_version,
      'authorityVersion', 1,
      'checkedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) INTO v_summary
      FROM public.workspace_tenants wt
     WHERE wt.id = v_intent.workspace_id;

    RETURN jsonb_build_object(
      'status', 'committed',
      'workspace', v_summary,
      'membership', jsonb_build_object('role', 'owner', 'status', 'active'),
      'receiptId', v_intent.receipt_id::text,
      'committedAt', to_char(v_intent.finalized_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'readinessState', 'setup_incomplete'
    );
  ELSIF v_intent.status = 'rejected' THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'code', COALESCE(v_intent.safe_error_code, 'workspace_creation_unavailable'),
      'diagnosticId', gen_random_uuid()::text,
      'recovery', 'retry'
    );
  ELSE
    RETURN jsonb_build_object(
      'status', 'outcome_unknown',
      'intentId', p_intent_id::text,
      'diagnosticId', gen_random_uuid()::text,
      'recovery', 'reconcile_creation'
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.solodesk_reconcile_workspace_creation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solodesk_reconcile_workspace_creation(uuid) TO authenticated;

-- 9. RPC: List Selectable Workspaces
CREATE OR REPLACE FUNCTION public.solodesk_list_selectable_workspaces()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_account record;
  v_workspaces jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO STRICT v_account FROM private.current_identity_account();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'workspaceId', wt.id,
      'displayName', wt.display_name,
      'discriminator', right(replace(wt.id, '-', ''), 4),
      'role', wm.role,
      'membershipStatus', wm.status,
      'workspaceStatus', wt.status,
      'readinessState', wt.readiness_state,
      'defaultTimezone', wt.default_timezone,
      'defaultCurrency', wt.default_currency,
      'defaultLocale', wt.default_locale,
      'profileVersion', wt.profile_version,
      'authorityVersion', 1,
      'checkedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) ORDER BY wt.created_at ASC
  ), '[]'::jsonb) INTO v_workspaces
    FROM public.workspace_memberships wm
    JOIN public.workspace_tenants wt ON wt.id = wm.workspace_id
   WHERE wm.user_id = v_account.subject_id
     AND wm.status = 'active'
     AND wt.status = 'active';

  RETURN v_workspaces;
END;
$$;
REVOKE ALL ON FUNCTION public.solodesk_list_selectable_workspaces() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solodesk_list_selectable_workspaces() TO authenticated;

-- 10. RPC: Check Workspace Selectability
CREATE OR REPLACE FUNCTION public.solodesk_check_workspace_selectability(p_workspace_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_account record;
  v_summary jsonb;
BEGIN
  SELECT * INTO STRICT v_account FROM private.current_identity_account();

  SELECT jsonb_build_object(
    'workspaceId', wt.id,
    'displayName', wt.display_name,
    'discriminator', right(replace(wt.id, '-', ''), 4),
    'role', wm.role,
    'membershipStatus', wm.status,
    'workspaceStatus', wt.status,
    'readinessState', wt.readiness_state,
    'defaultTimezone', wt.default_timezone,
    'defaultCurrency', wt.default_currency,
    'defaultLocale', wt.default_locale,
    'profileVersion', wt.profile_version,
    'authorityVersion', 1,
    'checkedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) INTO v_summary
    FROM public.workspace_memberships wm
    JOIN public.workspace_tenants wt ON wt.id = wm.workspace_id
   WHERE wm.workspace_id = p_workspace_id
     AND wm.user_id = v_account.subject_id
     AND wm.status = 'active'
     AND wt.status = 'active';

  IF v_summary IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'unavailable',
      'code', 'workspace_unavailable'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'selectable',
    'workspace', v_summary
  );
END;
$$;
REVOKE ALL ON FUNCTION public.solodesk_check_workspace_selectability(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solodesk_check_workspace_selectability(text) TO authenticated;
