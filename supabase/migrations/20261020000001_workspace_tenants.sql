-- Migration 20261020000001_workspace_tenants.sql
-- Baseline Administration Schema: workspace_tenants, workspace_memberships, tenant_audit_events

-- Workspace Tenants Table
CREATE TABLE IF NOT EXISTS public.workspace_tenants (
  id text PRIMARY KEY,
  legal_name text NOT NULL CHECK (char_length(legal_name) BETWEEN 1 AND 255),
  trade_name text CHECK (trade_name IS NULL OR char_length(trade_name) BETWEEN 1 AND 255),
  default_timezone text NOT NULL DEFAULT 'UTC',
  default_currency text NOT NULL CHECK (char_length(default_currency) = 3),
  default_locale text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en', 'ar')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closing', 'archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Workspace Memberships Table
CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'contributor', 'finance', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
  invited_email text CHECK (invited_email IS NULL OR invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  invitation_token text UNIQUE,
  invitation_expires_at timestamptz,
  granted_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, user_id)
);

-- Immutable Tenant Audit Events
CREATE TABLE IF NOT EXISTS public.tenant_audit_events (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  actor_id text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'membership_invited', 'membership_accepted', 'membership_revoked',
    'role_granted', 'role_changed', 'owner_transferred',
    'workspace_created', 'workspace_updated', 'policy_updated'
  )),
  target_resource_type text NOT NULL CHECK (char_length(target_resource_type) BETWEEN 1 AND 64),
  target_resource_id text NOT NULL CHECK (char_length(target_resource_id) BETWEEN 1 AND 128),
  change_diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_audit_event_workspace UNIQUE (workspace_id, id)
);

-- Create indexes for tenant queries
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.workspace_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON public.tenant_audit_events(workspace_id, occurred_at DESC);
