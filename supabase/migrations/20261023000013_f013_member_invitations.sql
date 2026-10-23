-- Migration 20261023000013_f013_member_invitations.sql
-- F013 Member Invitations Schema, Hardening, and Authoritative Functions

-- 1. Private Invitation Policies (T007)
CREATE TABLE IF NOT EXISTS private.invitation_policies (
  policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  revision bigint NOT NULL CHECK (revision > 0),
  offer_ref text NOT NULL CHECK (char_length(offer_ref) BETWEEN 1 AND 64),
  role_ref text NOT NULL CHECK (char_length(role_ref) BETWEEN 1 AND 64),
  scope_ref text NOT NULL CHECK (char_length(scope_ref) BETWEEN 1 AND 64),
  inviter_rule_ref text NOT NULL DEFAULT 'admin_only' CHECK (char_length(inviter_rule_ref) BETWEEN 1 AND 64),
  expiry_policy_ref text NOT NULL DEFAULT 'standard_7d' CHECK (char_length(expiry_policy_ref) BETWEEN 1 AND 64),
  enabled boolean NOT NULL DEFAULT false,
  effective_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_invitation_policy_workspace_rev_offer UNIQUE (workspace_id, revision, offer_ref)
);

REVOKE ALL ON TABLE private.invitation_policies FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_invitation_policies_active
  ON private.invitation_policies (workspace_id, offer_ref)
  WHERE enabled = true;

-- Seed synthetic policy for test environments (disabled by default in production)
INSERT INTO private.invitation_policies (
  workspace_id,
  revision,
  offer_ref,
  role_ref,
  scope_ref,
  inviter_rule_ref,
  expiry_policy_ref,
  enabled
)
SELECT
  id,
  1,
  'member_standard',
  'contributor',
  'workspace_read_write',
  'admin_only',
  'standard_7d',
  true
FROM public.workspace_tenants
ON CONFLICT DO NOTHING;

INSERT INTO private.invitation_policies (
  workspace_id,
  revision,
  offer_ref,
  role_ref,
  scope_ref,
  inviter_rule_ref,
  expiry_policy_ref,
  enabled
)
SELECT
  id,
  1,
  'read_only',
  'viewer',
  'workspace_read_only',
  'admin_only',
  'standard_7d',
  true
FROM public.workspace_tenants
ON CONFLICT DO NOTHING;

-- 2. Private Workspace Invitations (T008)
CREATE TABLE IF NOT EXISTS private.workspace_invitations (
  invitation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  recipient_binding_key bytea NOT NULL,
  recipient_issuer text,
  recipient_subject text,
  recipient_claim_digest bytea,
  recipient_label_ciphertext text,
  offer_ref text NOT NULL CHECK (char_length(offer_ref) BETWEEN 1 AND 64),
  role_ref text NOT NULL CHECK (char_length(role_ref) BETWEEN 1 AND 64),
  scope_ref text NOT NULL CHECK (char_length(scope_ref) BETWEEN 1 AND 64),
  policy_id uuid NOT NULL REFERENCES private.invitation_policies(policy_id) ON DELETE RESTRICT,
  policy_revision bigint NOT NULL CHECK (policy_revision > 0),
  inviter_issuer text NOT NULL,
  inviter_subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked', 'expired', 'superseded')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  current_generation_id uuid,
  accepted_membership_id text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  terminal_at timestamptz,
  terminal_reason text CHECK (terminal_reason IS NULL OR terminal_reason IN ('accepted', 'revoked', 'expired', 'superseded')),
  CONSTRAINT chk_invitation_expiry CHECK (expires_at > created_at),
  CONSTRAINT chk_invitation_binding CHECK (
    ((recipient_issuer IS NOT NULL AND recipient_subject IS NOT NULL) AND recipient_claim_digest IS NULL) OR
    ((recipient_issuer IS NULL AND recipient_subject IS NULL) AND recipient_claim_digest IS NOT NULL)
  ),
  CONSTRAINT chk_invitation_status_lifecycle CHECK (
    (status = 'pending' AND current_generation_id IS NOT NULL AND accepted_membership_id IS NULL AND terminal_at IS NULL AND terminal_reason IS NULL) OR
    (status = 'accepted' AND accepted_membership_id IS NOT NULL AND current_generation_id IS NULL AND terminal_at IS NOT NULL AND terminal_reason = 'accepted') OR
    (status IN ('revoked', 'expired', 'superseded') AND accepted_membership_id IS NULL AND current_generation_id IS NULL AND terminal_at IS NOT NULL AND terminal_reason IN ('revoked', 'expired', 'superseded'))
  )
);

REVOKE ALL ON TABLE private.workspace_invitations FROM PUBLIC, anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_pending
  ON private.workspace_invitations (workspace_id, recipient_binding_key)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_cursor
  ON private.workspace_invitations (workspace_id, created_at DESC, invitation_id DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expiry
  ON private.workspace_invitations (workspace_id, status, expires_at);

-- 3. Private Invitation Generations (T009)
CREATE TABLE IF NOT EXISTS private.invitation_generations (
  generation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES private.workspace_invitations(invitation_id) ON DELETE RESTRICT,
  generation_number integer NOT NULL CHECK (generation_number > 0),
  selector text NOT NULL CHECK (char_length(selector) BETWEEN 16 AND 64),
  secret_digest bytea NOT NULL,
  status text NOT NULL CHECK (status IN ('current', 'consumed', 'superseded', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  terminal_at timestamptz,
  consumed_by_issuer text,
  consumed_by_subject text,
  operation_id uuid NOT NULL,
  CONSTRAINT uq_invitation_generation_selector UNIQUE (selector),
  CONSTRAINT uq_invitation_generation_num UNIQUE (invitation_id, generation_number),
  CONSTRAINT chk_generation_expiry CHECK (expires_at > created_at),
  CONSTRAINT chk_generation_status CHECK (
    (status = 'current' AND terminal_at IS NULL AND consumed_by_issuer IS NULL AND consumed_by_subject IS NULL) OR
    (status = 'consumed' AND terminal_at IS NOT NULL AND consumed_by_issuer IS NOT NULL AND consumed_by_subject IS NOT NULL) OR
    (status IN ('superseded', 'revoked', 'expired') AND terminal_at IS NOT NULL AND consumed_by_issuer IS NULL AND consumed_by_subject IS NULL)
  )
);

REVOKE ALL ON TABLE private.invitation_generations FROM PUBLIC, anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_generations_current
  ON private.invitation_generations (invitation_id)
  WHERE status = 'current';

CREATE INDEX IF NOT EXISTS idx_invitation_generations_invitation
  ON private.invitation_generations (invitation_id);

-- 4. Private Delivery and Redemption Attempts (T010)
CREATE TABLE IF NOT EXISTS private.invitation_delivery_attempts (
  delivery_attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES private.workspace_invitations(invitation_id) ON DELETE RESTRICT,
  generation_id uuid NOT NULL REFERENCES private.invitation_generations(generation_id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'synthetic')),
  provider_ref_digest bytea,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'provider_accepted', 'delivered', 'delayed', 'failed', 'bounced', 'rate_limited', 'unknown')),
  safe_reason_code text,
  queued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  attempted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  provider_event_at timestamptz,
  CONSTRAINT uq_delivery_attempt_gen_num UNIQUE (generation_id, attempt_number)
);

REVOKE ALL ON TABLE private.invitation_delivery_attempts FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_invitation ON private.invitation_delivery_attempts (invitation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_generation ON private.invitation_delivery_attempts (generation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_provider ON private.invitation_delivery_attempts (provider_ref_digest) WHERE provider_ref_digest IS NOT NULL;

CREATE TABLE IF NOT EXISTS private.invitation_redemption_attempts (
  redemption_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES private.workspace_invitations(invitation_id) ON DELETE RESTRICT,
  generation_id uuid NOT NULL REFERENCES private.invitation_generations(generation_id) ON DELETE RESTRICT,
  continuation_digest bytea NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'awaiting_identity' CHECK (status IN ('awaiting_identity', 'reviewed', 'accepted', 'denied', 'expired')),
  verified_issuer text,
  verified_subject text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  terminal_at timestamptz,
  safe_reason_code text,
  CONSTRAINT chk_redemption_expiry CHECK (expires_at > created_at)
);

REVOKE ALL ON TABLE private.invitation_redemption_attempts FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_redemption_attempts_invitation ON private.invitation_redemption_attempts (invitation_id);
CREATE INDEX IF NOT EXISTS idx_redemption_attempts_generation ON private.invitation_redemption_attempts (generation_id);

-- 5. Extend public.workspace_memberships and Harden Legacy Data (T011)
ALTER TABLE public.workspace_memberships
  ADD COLUMN IF NOT EXISTS account_issuer text NOT NULL DEFAULT 'solodesk:auth',
  ADD COLUMN IF NOT EXISTS accepted_invitation_id uuid REFERENCES private.workspace_invitations(invitation_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS accepted_generation_id uuid REFERENCES private.invitation_generations(generation_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS accepted_policy_id uuid REFERENCES private.invitation_policies(policy_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS accepted_policy_revision bigint CHECK (accepted_policy_revision IS NULL OR accepted_policy_revision > 0),
  ADD COLUMN IF NOT EXISTS accepted_role_ref text,
  ADD COLUMN IF NOT EXISTS accepted_scope_ref text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_memberships_accepted_provenance'
  ) THEN
    ALTER TABLE public.workspace_memberships
      ADD CONSTRAINT chk_memberships_accepted_provenance
      CHECK (
        (accepted_invitation_id IS NULL AND accepted_generation_id IS NULL AND accepted_policy_id IS NULL AND accepted_policy_revision IS NULL AND accepted_role_ref IS NULL AND accepted_scope_ref IS NULL) OR
        (accepted_invitation_id IS NOT NULL AND accepted_generation_id IS NOT NULL AND accepted_policy_id IS NOT NULL AND accepted_policy_revision IS NOT NULL AND accepted_role_ref IS NOT NULL AND accepted_scope_ref IS NOT NULL)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_accepted_invitation
  ON public.workspace_memberships (accepted_invitation_id)
  WHERE accepted_invitation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_accepted_generation
  ON public.workspace_memberships (accepted_generation_id)
  WHERE accepted_generation_id IS NOT NULL;

-- Invalidate legacy raw tokens and classify legacy invited rows as non-authoritative terminal records
UPDATE public.workspace_memberships
   SET invitation_token = NULL
 WHERE invitation_token IS NOT NULL;

UPDATE public.workspace_memberships
   SET status = 'revoked'
 WHERE status = 'invited';

-- 6. Hardening grants and direct modification policies (T012)
REVOKE INSERT, UPDATE, DELETE ON public.workspace_memberships FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "memberships_insert_admin" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_update_admin" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_delete_admin" ON public.workspace_memberships;

-- 7. Restricted Functions (T025, T036, T046, T056)

-- 7.1 Get Policy
CREATE OR REPLACE FUNCTION public.solodesk_invitation_get_policy(p_workspace_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_caller_role text;
  v_policy_rev bigint;
  v_offers jsonb;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'connect_and_retry');
  END IF;

  SELECT role INTO v_caller_role
    FROM public.workspace_memberships
   WHERE workspace_id = p_workspace_id
     AND user_id = v_caller_id
     AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  SELECT MAX(revision) INTO v_policy_rev
    FROM private.invitation_policies
   WHERE workspace_id = p_workspace_id
     AND enabled = true
     AND (retired_at IS NULL OR retired_at > clock_timestamp());

  IF v_policy_rev IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'policyRevision', 1,
      'recipientInput', jsonb_build_object('kind', 'email', 'maxLength', 320),
      'offers', '[]'::jsonb,
      'expiryLabelKey', 'invitation.expiry.standard_7d',
      'canInvite', false
    );
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'offerRef', offer_ref,
      'roleLabelKey', 'roles.' || role_ref,
      'scopeLabelKey', 'scopes.' || scope_ref,
      'consequenceLabelKey', 'invitation.consequence.' || offer_ref
    )
  ) INTO v_offers
  FROM private.invitation_policies
  WHERE workspace_id = p_workspace_id
    AND revision = v_policy_rev
    AND enabled = true
    AND (retired_at IS NULL OR retired_at > clock_timestamp());

  RETURN jsonb_build_object(
    'ok', true,
    'policyRevision', v_policy_rev,
    'recipientInput', jsonb_build_object('kind', 'email', 'maxLength', 320),
    'offers', COALESCE(v_offers, '[]'::jsonb),
    'expiryLabelKey', 'invitation.expiry.standard_7d',
    'canInvite', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_get_policy(text) TO authenticated;

-- 7.2 Create Invitation
CREATE OR REPLACE FUNCTION public.solodesk_invitation_create(
  p_workspace_id text,
  p_operation_id uuid,
  p_request_digest text,
  p_recipient_email text,
  p_offer_ref text,
  p_policy_revision bigint,
  p_device_enrollment_id uuid,
  p_selector text,
  p_secret_digest bytea
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_caller_role text;
  v_policy record;
  v_binding_key bytea;
  v_normalized_email text := lower(trim(p_recipient_email));
  v_invitation_id uuid;
  v_generation_id uuid;
  v_existing_inv record;
  v_existing_receipt record;
  v_expires_at timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'connect_and_retry');
  END IF;

  -- Verify caller authority
  SELECT role INTO v_caller_role
    FROM public.workspace_memberships
   WHERE workspace_id = p_workspace_id
     AND user_id = v_caller_id
     AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  -- Replay check in command_operations
  SELECT * INTO v_existing_receipt
    FROM private.command_operations
   WHERE workspace_id = p_workspace_id
     AND actor_id = v_caller_id
     AND operation_type = 'invitation.create'
     AND operation_id = p_operation_id::text;

  IF v_existing_receipt IS NOT NULL THEN
    IF v_existing_receipt.intent_digest != p_request_digest THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'action', 'correct_input');
    END IF;
    -- Return existing invitation summary
    SELECT * INTO v_existing_inv
      FROM private.workspace_invitations
     WHERE invitation_id = v_existing_receipt.target_id::uuid;
    IF v_existing_inv IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true,
        'effect', 'replayed',
        'invitation', jsonb_build_object(
          'invitationId', v_existing_inv.invitation_id::text,
          'revision', v_existing_inv.revision,
          'recipientLabel', v_normalized_email,
          'offerRef', v_existing_inv.offer_ref,
          'roleLabelKey', 'roles.' || v_existing_inv.role_ref,
          'scopeLabelKey', 'scopes.' || v_existing_inv.scope_ref,
          'lifecycle', v_existing_inv.status,
          'expiresAt', to_char(v_existing_inv.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'deliveryOutcome', 'queued',
          'membershipOutcome', 'not_created',
          'availableActions', jsonb_build_array('resend', 'revoke', 'refresh'),
          'updatedAt', to_char(v_existing_inv.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      );
    END IF;
  END IF;

  -- Validate enabled policy
  SELECT * INTO v_policy
    FROM private.invitation_policies
   WHERE workspace_id = p_workspace_id
     AND offer_ref = p_offer_ref
     AND revision = p_policy_revision
     AND enabled = true
     AND (retired_at IS NULL OR retired_at > clock_timestamp());

  IF v_policy IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'policy_unavailable', 'action', 'refresh');
  END IF;

  -- Validate recipient binding
  v_binding_key := digest('solodesk:recipient:' || v_normalized_email, 'sha256');

  -- Check if recipient is already an active member
  IF EXISTS (
    SELECT 1 FROM public.workspace_memberships
     WHERE workspace_id = p_workspace_id
       AND (lower(invited_email) = v_normalized_email OR user_id = v_normalized_email)
       AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'recipient_already_member', 'action', 'none');
  END IF;

  -- Check if already pending
  SELECT * INTO v_existing_inv
    FROM private.workspace_invitations
   WHERE workspace_id = p_workspace_id
     AND recipient_binding_key = v_binding_key
     AND status = 'pending';

  IF v_existing_inv IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invitation_already_pending', 'action', 'refresh');
  END IF;

  v_invitation_id := gen_random_uuid();
  v_generation_id := gen_random_uuid();
  v_expires_at := clock_timestamp() + interval '7 days';

  -- Create generation first or together
  -- Insert invitation
  INSERT INTO private.workspace_invitations (
    invitation_id,
    workspace_id,
    recipient_binding_key,
    recipient_claim_digest,
    recipient_label_ciphertext,
    offer_ref,
    role_ref,
    scope_ref,
    policy_id,
    policy_revision,
    inviter_issuer,
    inviter_subject,
    status,
    revision,
    current_generation_id,
    created_at,
    expires_at
  ) VALUES (
    v_invitation_id,
    p_workspace_id,
    v_binding_key,
    digest('solodesk:claim:' || v_normalized_email, 'sha256'),
    v_normalized_email,
    p_offer_ref,
    v_policy.role_ref,
    v_policy.scope_ref,
    v_policy.policy_id,
    p_policy_revision,
    'solodesk:auth',
    v_caller_id,
    'pending',
    1,
    v_generation_id,
    clock_timestamp(),
    v_expires_at
  );

  -- Insert generation
  INSERT INTO private.invitation_generations (
    generation_id,
    invitation_id,
    generation_number,
    selector,
    secret_digest,
    status,
    created_at,
    expires_at,
    operation_id
  ) VALUES (
    v_generation_id,
    v_invitation_id,
    1,
    p_selector,
    p_secret_digest,
    'current',
    clock_timestamp(),
    v_expires_at,
    p_operation_id
  );

  -- Insert initial delivery attempt
  INSERT INTO private.invitation_delivery_attempts (
    invitation_id,
    generation_id,
    attempt_number,
    channel,
    status,
    queued_at,
    updated_at
  ) VALUES (
    v_invitation_id,
    v_generation_id,
    1,
    'email',
    'queued',
    clock_timestamp(),
    clock_timestamp()
  );

  -- Record command operation receipt
  INSERT INTO private.command_operations (
    workspace_id,
    actor_id,
    operation_type,
    operation_id,
    intent_digest,
    target_kind,
    target_id,
    disposition,
    result_locator,
    created_at,
    finalized_at
  ) VALUES (
    p_workspace_id,
    v_caller_id,
    'invitation.create',
    p_operation_id::text,
    p_request_digest,
    'invitation',
    v_invitation_id::text,
    'committed',
    v_invitation_id::text,
    clock_timestamp(),
    clock_timestamp()
  );

  -- Record audit event
  INSERT INTO public.tenant_audit_events (
    id,
    workspace_id,
    actor_id,
    action_type,
    target_resource_type,
    target_resource_id,
    change_diff,
    correlation_id,
    occurred_at
  ) VALUES (
    'aud_' || substr(md5(random()::text), 1, 16),
    p_workspace_id,
    v_caller_id,
    'membership_invited',
    'invitation',
    v_invitation_id::text,
    jsonb_build_object(
      'offerRef', p_offer_ref,
      'roleRef', v_policy.role_ref,
      'scopeRef', v_policy.scope_ref,
      'expiresAt', v_expires_at
    ),
    p_operation_id::text,
    clock_timestamp()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'effect', 'created',
    'invitation', jsonb_build_object(
      'invitationId', v_invitation_id::text,
      'revision', 1,
      'recipientLabel', v_normalized_email,
      'offerRef', p_offer_ref,
      'roleLabelKey', 'roles.' || v_policy.role_ref,
      'scopeLabelKey', 'scopes.' || v_policy.scope_ref,
      'lifecycle', 'pending',
      'expiresAt', to_char(v_expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'deliveryOutcome', 'queued',
      'membershipOutcome', 'not_created',
      'availableActions', jsonb_build_array('resend', 'revoke', 'refresh'),
      'updatedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_create(text, uuid, text, text, text, bigint, uuid, text, bytea) TO authenticated;

-- 7.3 Resend Invitation
CREATE OR REPLACE FUNCTION public.solodesk_invitation_resend(
  p_workspace_id text,
  p_operation_id uuid,
  p_request_digest text,
  p_invitation_id uuid,
  p_expected_revision bigint,
  p_selector text,
  p_secret_digest bytea
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_caller_role text;
  v_existing_receipt record;
  v_inv record;
  v_old_gen_id uuid;
  v_new_gen_id uuid;
  v_new_gen_num integer;
  v_new_expires_at timestamptz;
  v_new_rev bigint;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'connect_and_retry');
  END IF;

  SELECT role INTO v_caller_role
    FROM public.workspace_memberships
   WHERE workspace_id = p_workspace_id
     AND user_id = v_caller_id
     AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  -- Replay check in command_operations
  SELECT * INTO v_existing_receipt
    FROM private.command_operations
   WHERE workspace_id = p_workspace_id
     AND actor_id = v_caller_id
     AND operation_type = 'invitation.resend'
     AND operation_id = p_operation_id::text;

  IF v_existing_receipt IS NOT NULL THEN
    SELECT * INTO v_inv
      FROM private.workspace_invitations
     WHERE invitation_id = p_invitation_id;
    RETURN jsonb_build_object(
      'ok', true,
      'effect', 'replayed',
      'invitation', jsonb_build_object(
        'invitationId', p_invitation_id::text,
        'revision', v_inv.revision,
        'recipientLabel', COALESCE(v_inv.recipient_label_ciphertext, 'recipient'),
        'offerRef', v_inv.offer_ref,
        'roleLabelKey', 'roles.' || v_inv.role_ref,
        'scopeLabelKey', 'scopes.' || v_inv.scope_ref,
        'lifecycle', v_inv.status,
        'expiresAt', to_char(v_inv.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'deliveryOutcome', 'queued',
        'membershipOutcome', 'not_created',
        'availableActions', jsonb_build_array('resend', 'revoke', 'refresh'),
        'updatedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    );
  END IF;

  -- Lock invitation row
  SELECT * INTO v_inv
    FROM private.workspace_invitations
   WHERE invitation_id = p_invitation_id
      AND workspace_id = p_workspace_id
   FOR UPDATE;

  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  IF v_inv.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'stale_state', 'action', 'refresh');
  END IF;

  IF v_inv.revision != p_expected_revision THEN
    RETURN jsonb_build_object('ok', false, 'code', 'stale_state', 'action', 'refresh');
  END IF;

  v_old_gen_id := v_inv.current_generation_id;
  v_new_gen_id := gen_random_uuid();
  v_new_expires_at := clock_timestamp() + interval '7 days';
  v_new_rev := v_inv.revision + 1;

  -- Supersede older current generation
  UPDATE private.invitation_generations
     SET status = 'superseded',
         terminal_at = clock_timestamp()
   WHERE generation_id = v_old_gen_id;

  SELECT COALESCE(MAX(generation_number), 1) + 1 INTO v_new_gen_num
    FROM private.invitation_generations
   WHERE invitation_id = p_invitation_id;

  -- Insert new generation
  INSERT INTO private.invitation_generations (
    generation_id,
    invitation_id,
    generation_number,
    selector,
    secret_digest,
    status,
    created_at,
    expires_at,
    operation_id
  ) VALUES (
    v_new_gen_id,
    p_invitation_id,
    v_new_gen_num,
    p_selector,
    p_secret_digest,
    'current',
    clock_timestamp(),
    v_new_expires_at,
    p_operation_id
  );

  -- Update invitation with new current generation and incremented revision
  UPDATE private.workspace_invitations
     SET current_generation_id = v_new_gen_id,
         revision = v_new_rev,
         expires_at = v_new_expires_at
   WHERE invitation_id = p_invitation_id;

  -- Insert delivery attempt
  INSERT INTO private.invitation_delivery_attempts (
    invitation_id,
    generation_id,
    attempt_number,
    channel,
    status,
    queued_at,
    updated_at
  ) VALUES (
    p_invitation_id,
    v_new_gen_id,
    1,
    'email',
    'queued',
    clock_timestamp(),
    clock_timestamp()
  );

  -- Record operation
  INSERT INTO private.command_operations (
    workspace_id,
    actor_id,
    operation_type,
    operation_id,
    intent_digest,
    target_kind,
    target_id,
    disposition,
    result_locator,
    created_at,
    finalized_at
  ) VALUES (
    p_workspace_id,
    v_caller_id,
    'invitation.resend',
    p_operation_id::text,
    p_request_digest,
    'invitation',
    p_invitation_id::text,
    'committed',
    p_invitation_id::text,
    clock_timestamp(),
    clock_timestamp()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'effect', 'resent',
    'invitation', jsonb_build_object(
      'invitationId', p_invitation_id::text,
      'revision', v_new_rev,
      'recipientLabel', COALESCE(v_inv.recipient_label_ciphertext, 'recipient'),
      'offerRef', v_inv.offer_ref,
      'roleLabelKey', 'roles.' || v_inv.role_ref,
      'scopeLabelKey', 'scopes.' || v_inv.scope_ref,
      'lifecycle', 'pending',
      'expiresAt', to_char(v_new_expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'deliveryOutcome', 'queued',
      'membershipOutcome', 'not_created',
      'availableActions', jsonb_build_array('resend', 'revoke', 'refresh'),
      'updatedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_resend(text, uuid, text, uuid, bigint, text, bytea) TO authenticated;

-- 7.4 Revoke Invitation
CREATE OR REPLACE FUNCTION public.solodesk_invitation_revoke(
  p_workspace_id text,
  p_operation_id uuid,
  p_request_digest text,
  p_invitation_id uuid,
  p_expected_revision bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_caller_role text;
  v_existing_receipt record;
  v_inv record;
  v_new_rev bigint;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'connect_and_retry');
  END IF;

  SELECT role INTO v_caller_role
    FROM public.workspace_memberships
   WHERE workspace_id = p_workspace_id
     AND user_id = v_caller_id
     AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  -- Replay check in command_operations
  SELECT * INTO v_existing_receipt
    FROM private.command_operations
   WHERE workspace_id = p_workspace_id
     AND actor_id = v_caller_id
     AND operation_type = 'invitation.revoke'
     AND operation_id = p_operation_id::text;

  IF v_existing_receipt IS NOT NULL THEN
    SELECT * INTO v_inv
      FROM private.workspace_invitations
     WHERE invitation_id = p_invitation_id;
    RETURN jsonb_build_object(
      'ok', true,
      'effect', 'replayed',
      'invitation', jsonb_build_object(
        'invitationId', p_invitation_id::text,
        'revision', v_inv.revision,
        'recipientLabel', COALESCE(v_inv.recipient_label_ciphertext, 'recipient'),
        'offerRef', v_inv.offer_ref,
        'roleLabelKey', 'roles.' || v_inv.role_ref,
        'scopeLabelKey', 'scopes.' || v_inv.scope_ref,
        'lifecycle', v_inv.status,
        'expiresAt', to_char(v_inv.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'deliveryOutcome', 'unknown',
        'membershipOutcome', 'not_created',
        'availableActions', jsonb_build_array('refresh'),
        'updatedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    );
  END IF;

  -- Lock invitation row
  SELECT * INTO v_inv
    FROM private.workspace_invitations
   WHERE invitation_id = p_invitation_id
     AND workspace_id = p_workspace_id
   FOR UPDATE;

  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  IF v_inv.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'stale_state', 'action', 'refresh');
  END IF;

  IF v_inv.revision != p_expected_revision THEN
    RETURN jsonb_build_object('ok', false, 'code', 'stale_state', 'action', 'refresh');
  END IF;

  v_new_rev := v_inv.revision + 1;

  -- Revoke current generation
  IF v_inv.current_generation_id IS NOT NULL THEN
    UPDATE private.invitation_generations
       SET status = 'revoked',
           terminal_at = clock_timestamp()
     WHERE generation_id = v_inv.current_generation_id;
  END IF;

  -- Terminalize invitation
  UPDATE private.workspace_invitations
     SET status = 'revoked',
         current_generation_id = NULL,
         terminal_at = clock_timestamp(),
         terminal_reason = 'revoked',
         revision = v_new_rev
   WHERE invitation_id = p_invitation_id;

  -- Record operation
  INSERT INTO private.command_operations (
    workspace_id,
    actor_id,
    operation_type,
    operation_id,
    intent_digest,
    target_kind,
    target_id,
    disposition,
    result_locator,
    created_at,
    finalized_at
  ) VALUES (
    p_workspace_id,
    v_caller_id,
    'invitation.revoke',
    p_operation_id::text,
    p_request_digest,
    'invitation',
    p_invitation_id::text,
    'committed',
    p_invitation_id::text,
    clock_timestamp(),
    clock_timestamp()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'effect', 'revoked',
    'invitation', jsonb_build_object(
      'invitationId', p_invitation_id::text,
      'revision', v_new_rev,
      'recipientLabel', COALESCE(v_inv.recipient_label_ciphertext, 'recipient'),
      'offerRef', v_inv.offer_ref,
      'roleLabelKey', 'roles.' || v_inv.role_ref,
      'scopeLabelKey', 'scopes.' || v_inv.scope_ref,
      'lifecycle', 'revoked',
      'expiresAt', to_char(v_inv.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'deliveryOutcome', 'unknown',
      'membershipOutcome', 'not_created',
      'availableActions', jsonb_build_array('refresh'),
      'updatedAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_revoke(text, uuid, text, uuid, bigint) TO authenticated;

-- 7.5 List Invitations
CREATE OR REPLACE FUNCTION public.solodesk_invitation_list(
  p_workspace_id text,
  p_page_size integer DEFAULT 20,
  p_cursor text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_caller_role text;
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 50);
  v_cursor_created_at timestamptz;
  v_cursor_id uuid;
  v_cursor_json jsonb;
  v_next_cursor text := NULL;
  v_last_created_at timestamptz;
  v_last_id uuid;
  v_items jsonb;
  v_policy_rev bigint;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'connect_and_retry');
  END IF;

  SELECT role INTO v_caller_role
    FROM public.workspace_memberships
   WHERE workspace_id = p_workspace_id
     AND user_id = v_caller_id
     AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'none');
  END IF;

  -- Expire pending invitations that have passed their expiration deadline
  UPDATE private.workspace_invitations
     SET status = 'expired',
         terminal_at = v_now
   WHERE workspace_id = p_workspace_id
     AND status = 'pending'
     AND expires_at < v_now;

  -- Decode cursor if provided
  IF p_cursor IS NOT NULL AND length(trim(p_cursor)) > 0 THEN
    BEGIN
      v_cursor_json := convert_from(decode(replace(replace(p_cursor, '-', '+'), '_', '/'), 'base64'), 'UTF8')::jsonb;
      IF v_cursor_json->>'w' = p_workspace_id THEN
        v_cursor_created_at := (v_cursor_json->>'c')::timestamptz;
        v_cursor_id := (v_cursor_json->>'i')::uuid;
      ELSE
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'action', 'refresh');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'action', 'refresh');
    END;
  END IF;

  SELECT MAX(revision) INTO v_policy_rev
    FROM private.invitation_policies
   WHERE workspace_id = p_workspace_id;

  SELECT jsonb_agg(q.item_obj),
         (array_agg(q.raw_created_at))[array_length(array_agg(q.raw_created_at), 1)],
         (array_agg(q.raw_id))[array_length(array_agg(q.raw_id), 1)]
    INTO v_items, v_last_created_at, v_last_id
    FROM (
      SELECT
        jsonb_build_object(
          'invitationId', wi.invitation_id::text,
          'revision', wi.revision,
          'recipientLabel', COALESCE(wi.recipient_label_ciphertext, 'recipient'),
          'offerRef', wi.offer_ref,
          'roleLabelKey', 'roles.' || wi.role_ref,
          'scopeLabelKey', 'scopes.' || wi.scope_ref,
          'lifecycle', wi.status,
          'expiresAt', to_char(wi.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'deliveryOutcome', COALESCE(
            (SELECT da.status FROM private.invitation_delivery_attempts da WHERE da.invitation_id = wi.invitation_id ORDER BY da.updated_at DESC LIMIT 1),
            'unknown'
          ),
          'membershipOutcome', CASE WHEN wi.status = 'accepted' THEN 'active' ELSE 'not_created' END,
          'availableActions', CASE
            WHEN wi.status = 'pending' THEN jsonb_build_array('resend', 'revoke', 'refresh')
            ELSE jsonb_build_array('refresh')
          END,
          'updatedAt', to_char(COALESCE(wi.terminal_at, wi.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        ) AS item_obj,
        wi.created_at AS raw_created_at,
        wi.invitation_id AS raw_id
        FROM private.workspace_invitations wi
       WHERE wi.workspace_id = p_workspace_id
         AND (
           v_cursor_created_at IS NULL
           OR (wi.created_at < v_cursor_created_at)
           OR (wi.created_at = v_cursor_created_at AND wi.invitation_id < v_cursor_id)
         )
       ORDER BY wi.created_at DESC, wi.invitation_id DESC
       LIMIT v_page_size
    ) q;

  -- Generate nextCursor if a full page was returned
  IF jsonb_array_length(COALESCE(v_items, '[]'::jsonb)) = v_page_size AND v_last_created_at IS NOT NULL THEN
    v_next_cursor := replace(replace(encode(
      convert_to(
        jsonb_build_object(
          'w', p_workspace_id,
          'c', to_char(v_last_created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'i', v_last_id::text,
          'e', to_char(v_now + interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )::text,
        'UTF8'
      ),
      'base64'
    ), '+', '-'), '/', '_');
    v_next_cursor := rtrim(v_next_cursor, '=');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'items', COALESCE(v_items, '[]'::jsonb),
    'nextCursor', v_next_cursor,
    'policyRevision', COALESCE(v_policy_rev, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_list(text, integer, text) TO authenticated;

-- 7.6 Reconcile Invitation Operation
CREATE OR REPLACE FUNCTION public.solodesk_invitation_reconcile(
  p_workspace_id text,
  p_operation_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_op record;
  v_inv record;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized', 'action', 'connect_and_retry');
  END IF;

  SELECT * INTO v_op
    FROM private.command_operations
   WHERE workspace_id = p_workspace_id
     AND actor_id = v_caller_id
     AND operation_id = p_operation_id::text;

  IF v_op IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'outcome', 'not_committed');
  END IF;

  IF v_op.disposition = 'committed' AND v_op.target_id IS NOT NULL THEN
    SELECT * INTO v_inv
      FROM private.workspace_invitations
     WHERE invitation_id = v_op.target_id::uuid;

    IF v_inv IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true,
        'outcome', 'committed',
        'invitation', jsonb_build_object(
          'invitationId', v_inv.invitation_id::text,
          'revision', v_inv.revision,
          'recipientLabel', COALESCE(v_inv.recipient_label_ciphertext, 'recipient'),
          'offerRef', v_inv.offer_ref,
          'roleLabelKey', 'roles.' || v_inv.role_ref,
          'scopeLabelKey', 'scopes.' || v_inv.scope_ref,
          'lifecycle', v_inv.status,
          'expiresAt', to_char(v_inv.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'deliveryOutcome', 'queued',
          'membershipOutcome', CASE WHEN v_inv.status = 'accepted' THEN 'active' ELSE 'not_created' END,
          'availableActions', jsonb_build_array('resend', 'revoke', 'refresh'),
          'updatedAt', to_char(COALESCE(v_inv.terminal_at, v_inv.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'outcome', 'still_processing');
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_reconcile(text, uuid) TO authenticated;

-- 7.7 Exchange Invitation Secret (Hosted Public Gateway)
CREATE OR REPLACE FUNCTION public.solodesk_invitation_exchange(
  p_selector text,
  p_secret_digest bytea,
  p_continuation_digest bytea
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_gen record;
  v_inv record;
  v_redemption_id uuid;
BEGIN
  -- Constant-time check and lookup by selector
  SELECT * INTO v_gen
    FROM private.invitation_generations
   WHERE selector = p_selector
     AND status = 'current';

  IF v_gen IS NULL THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'request_new_invitation');
  END IF;

  IF v_gen.secret_digest != p_secret_digest THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'request_new_invitation');
  END IF;

  IF v_gen.expires_at <= clock_timestamp() THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'request_new_invitation');
  END IF;

  SELECT * INTO v_inv
    FROM private.workspace_invitations
   WHERE invitation_id = v_gen.invitation_id;

  IF v_inv IS NULL OR v_inv.status != 'pending' OR v_inv.expires_at <= clock_timestamp() THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'request_new_invitation');
  END IF;

  v_redemption_id := gen_random_uuid();

  -- Insert redemption attempt with short 1-hour window
  INSERT INTO private.invitation_redemption_attempts (
    redemption_id,
    invitation_id,
    generation_id,
    continuation_digest,
    status,
    created_at,
    expires_at
  ) VALUES (
    v_redemption_id,
    v_inv.invitation_id,
    v_gen.generation_id,
    p_continuation_digest,
    'awaiting_identity',
    clock_timestamp(),
    LEAST(v_gen.expires_at, clock_timestamp() + interval '1 hour')
  );

  RETURN jsonb_build_object('state', 'continue', 'next', 'sign_in');
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_exchange(text, bytea, bytea) TO anon, authenticated;

-- 7.8 Review Invitation (Requires Signed-in Caller)
CREATE OR REPLACE FUNCTION public.solodesk_invitation_review(
  p_continuation_digest bytea
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_redemption record;
  v_inv record;
  v_ws record;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'try_again_later');
  END IF;

  SELECT * INTO v_redemption
    FROM private.invitation_redemption_attempts
   WHERE continuation_digest = p_continuation_digest
     AND expires_at > clock_timestamp()
     AND status IN ('awaiting_identity', 'reviewed');

  IF v_redemption IS NULL THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'request_new_invitation');
  END IF;

  SELECT * INTO v_inv
    FROM private.workspace_invitations
   WHERE invitation_id = v_redemption.invitation_id
     AND status = 'pending'
     AND expires_at > clock_timestamp();

  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('state', 'unavailable', 'action', 'request_new_invitation');
  END IF;

  -- Validate recipient identity match
  IF v_inv.recipient_type = 'account_identity' THEN
    IF v_inv.recipient_issuer != 'solodesk:auth' OR v_inv.recipient_subject != v_caller_id THEN
      RETURN jsonb_build_object('state', 'unavailable', 'action', 'switch_account');
    END IF;
  ELSIF v_inv.recipient_type = 'unresolved_verified_claim' AND v_inv.recipient_claim_name = 'email' THEN
    IF lower(COALESCE(auth.jwt()->>'email', '')) != lower(v_inv.recipient_claim_value) THEN
      RETURN jsonb_build_object('state', 'unavailable', 'action', 'switch_account');
    END IF;
  END IF;

  SELECT * INTO v_ws
    FROM public.workspace_tenants
   WHERE id = v_inv.workspace_id;

  -- Update redemption record with verified identity
  UPDATE private.invitation_redemption_attempts
     SET status = 'reviewed',
         verified_issuer = 'solodesk:auth',
         verified_subject = v_caller_id
   WHERE redemption_id = v_redemption.redemption_id;

  RETURN jsonb_build_object(
    'state', 'review',
    'invitationRef', 'inv_' || substr(md5(v_inv.invitation_id::text), 1, 12),
    'workspaceLabel', COALESCE(v_ws.display_name, 'Workspace'),
    'inviterLabel', v_inv.inviter_subject,
    'roleLabelKey', 'roles.' || v_inv.role_ref,
    'scopeLabelKey', 'scopes.' || v_inv.scope_ref,
    'consequenceLabelKey', 'invitation.consequence.' || v_inv.offer_ref,
    'expiresAt', to_char(v_inv.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'revision', v_inv.revision
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_review(bytea) TO authenticated;

-- 7.9 Accept Invitation
CREATE OR REPLACE FUNCTION public.solodesk_invitation_accept(
  p_continuation_digest bytea,
  p_operation_id uuid,
  p_request_digest text,
  p_expected_revision bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_caller_id text := auth.uid()::text;
  v_redemption record;
  v_inv record;
  v_gen record;
  v_ws record;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'online_required', 'action', 'switch_account');
  END IF;

  -- Lookup redemption attempt
  SELECT * INTO v_redemption
    FROM private.invitation_redemption_attempts
   WHERE continuation_digest = p_continuation_digest
     AND expires_at > clock_timestamp()
     AND status IN ('awaiting_identity', 'reviewed', 'accepted');

  IF v_redemption IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invitation_unavailable', 'action', 'request_new_invitation');
  END IF;

  -- Idempotent replay check: if invitation already accepted by this caller
  SELECT * INTO v_inv
    FROM private.workspace_invitations
   WHERE invitation_id = v_redemption.invitation_id;

  IF v_inv IS NOT NULL AND v_inv.status = 'accepted' AND v_inv.accepted_membership_id = v_caller_id THEN
    SELECT * INTO v_ws FROM public.workspace_tenants WHERE id = v_inv.workspace_id;
    RETURN jsonb_build_object(
      'ok', true,
      'effect', 'replayed',
      'membershipRef', 'mem_' || substr(md5(v_caller_id), 1, 12),
      'workspaceLabel', COALESCE(v_ws.display_name, 'Workspace'),
      'roleLabelKey', 'roles.' || v_inv.role_ref,
      'scopeLabelKey', 'scopes.' || v_inv.scope_ref
    );
  END IF;

  -- Lock invitation row
  SELECT * INTO v_inv
    FROM private.workspace_invitations
   WHERE invitation_id = v_redemption.invitation_id
   FOR UPDATE;

  IF v_inv IS NULL OR v_inv.status != 'pending' OR v_inv.expires_at <= clock_timestamp() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invitation_unavailable', 'action', 'request_new_invitation');
  END IF;

  -- Validate recipient identity match
  IF v_inv.recipient_type = 'account_identity' THEN
    IF v_inv.recipient_issuer != 'solodesk:auth' OR v_inv.recipient_subject != v_caller_id THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invitation_unavailable', 'action', 'switch_account');
    END IF;
  ELSIF v_inv.recipient_type = 'unresolved_verified_claim' AND v_inv.recipient_claim_name = 'email' THEN
    IF lower(COALESCE(auth.jwt()->>'email', '')) != lower(v_inv.recipient_claim_value) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invitation_unavailable', 'action', 'switch_account');
    END IF;
  END IF;

  IF v_inv.revision != p_expected_revision THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invitation_unavailable', 'action', 'request_new_invitation');
  END IF;

  -- Lock current generation row
  SELECT * INTO v_gen
    FROM private.invitation_generations
   WHERE generation_id = v_inv.current_generation_id
     AND status = 'current'
   FOR UPDATE;

  IF v_gen IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invitation_unavailable', 'action', 'request_new_invitation');
  END IF;

  SELECT * INTO v_ws
    FROM public.workspace_tenants
   WHERE id = v_inv.workspace_id;

  -- Insert or verify membership
  INSERT INTO public.workspace_memberships (
    workspace_id,
    user_id,
    role,
    status,
    account_issuer,
    accepted_invitation_id,
    accepted_generation_id,
    accepted_policy_id,
    accepted_policy_revision,
    accepted_role_ref,
    accepted_scope_ref,
    created_at,
    updated_at
  ) VALUES (
    v_inv.workspace_id,
    v_caller_id,
    v_inv.role_ref,
    'active',
    'solodesk:auth',
    v_inv.invitation_id,
    v_gen.generation_id,
    v_inv.policy_id,
    v_inv.policy_revision,
    v_inv.role_ref,
    v_inv.scope_ref,
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Consume generation
  UPDATE private.invitation_generations
     SET status = 'consumed',
         terminal_at = clock_timestamp(),
         consumed_by_issuer = 'solodesk:auth',
         consumed_by_subject = v_caller_id
   WHERE generation_id = v_gen.generation_id;

  -- Mark invitation accepted
  UPDATE private.workspace_invitations
     SET status = 'accepted',
         current_generation_id = NULL,
         accepted_membership_id = v_caller_id,
         terminal_at = clock_timestamp(),
         terminal_reason = 'accepted',
         revision = v_inv.revision + 1
   WHERE invitation_id = v_inv.invitation_id;

  -- Consume redemption attempt
  UPDATE private.invitation_redemption_attempts
     SET status = 'accepted',
         terminal_at = clock_timestamp()
   WHERE redemption_id = v_redemption.redemption_id;

  RETURN jsonb_build_object(
    'ok', true,
    'effect', 'accepted',
    'membershipRef', 'mem_' || substr(md5(v_caller_id), 1, 12),
    'workspaceLabel', COALESCE(v_ws.display_name, 'Workspace'),
    'roleLabelKey', 'roles.' || v_inv.role_ref,
    'scopeLabelKey', 'scopes.' || v_inv.scope_ref
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solodesk_invitation_accept(bytea, uuid, text, bigint) TO authenticated;
