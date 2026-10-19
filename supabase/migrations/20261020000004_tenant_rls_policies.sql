-- Migration 20261020000004_tenant_rls_policies.sql
-- Core Administration Row Level Security (RLS) Policies

-- 1. Enable & Force Row Level Security on Core Tables
ALTER TABLE public.workspace_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_events FORCE ROW LEVEL SECURITY;

-- 2. workspace_tenants Policies
DROP POLICY IF EXISTS "tenants_select_member" ON public.workspace_tenants;
CREATE POLICY "tenants_select_member" ON public.workspace_tenants
  FOR SELECT USING (public.has_active_membership(id));

DROP POLICY IF EXISTS "tenants_update_admin" ON public.workspace_tenants;
CREATE POLICY "tenants_update_admin" ON public.workspace_tenants
  FOR UPDATE USING (
    public.has_active_membership(id) AND
    public.get_workspace_role(id) IN ('owner', 'admin')
  );

-- 3. workspace_memberships Policies
DROP POLICY IF EXISTS "memberships_select_member" ON public.workspace_memberships;
CREATE POLICY "memberships_select_member" ON public.workspace_memberships
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "memberships_insert_admin" ON public.workspace_memberships;
CREATE POLICY "memberships_insert_admin" ON public.workspace_memberships
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "memberships_update_admin" ON public.workspace_memberships;
CREATE POLICY "memberships_update_admin" ON public.workspace_memberships
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "memberships_delete_admin" ON public.workspace_memberships;
CREATE POLICY "memberships_delete_admin" ON public.workspace_memberships
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- 4. tenant_audit_events Policies
DROP POLICY IF EXISTS "audit_select_admin" ON public.tenant_audit_events;
CREATE POLICY "audit_select_admin" ON public.tenant_audit_events
  FOR SELECT USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );
