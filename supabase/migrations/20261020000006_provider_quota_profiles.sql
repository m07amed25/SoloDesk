-- Migration 20261020000006_provider_quota_profiles.sql
-- Provider quota profiles and threshold evaluation table

CREATE TABLE IF NOT EXISTS public.provider_quota_profiles (
  workspace_id text PRIMARY KEY REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  db_storage_bytes bigint NOT NULL DEFAULT 0 CHECK (db_storage_bytes >= 0),
  object_storage_bytes bigint NOT NULL DEFAULT 0 CHECK (object_storage_bytes >= 0),
  monthly_egress_bytes bigint NOT NULL DEFAULT 0 CHECK (monthly_egress_bytes >= 0),
  db_storage_limit_bytes bigint NOT NULL DEFAULT 524288000, -- 500 MB default free allowance
  object_storage_limit_bytes bigint NOT NULL DEFAULT 1073741824, -- 1 GB default free allowance
  monthly_egress_limit_bytes bigint NOT NULL DEFAULT 5368709120, -- 5 GB default free allowance
  quota_tier text NOT NULL DEFAULT 'normal' CHECK (quota_tier IN ('normal', 'warning_70', 'warning_85', 'critical_95', 'exhausted_100')),
  provider_status text NOT NULL DEFAULT 'operational' CHECK (provider_status IN ('operational', 'degraded', 'paused', 'maintenance')),
  last_evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Enable and Force RLS on provider_quota_profiles
ALTER TABLE public.provider_quota_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_quota_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quota_select_member" ON public.provider_quota_profiles;
CREATE POLICY "quota_select_member" ON public.provider_quota_profiles
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "quota_update_admin" ON public.provider_quota_profiles;
CREATE POLICY "quota_update_admin" ON public.provider_quota_profiles
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );
