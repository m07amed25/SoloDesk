-- Migration 20261020000002_security_helper_functions.sql
-- Security Definer helper functions: current_user_id, has_active_membership, get_workspace_role

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text AS $$
  SELECT COALESCE(auth.uid()::text, '');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_active_membership(p_workspace_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = public.current_user_id()
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id text)
RETURNS text AS $$
  SELECT role
  FROM public.workspace_memberships
  WHERE workspace_id = p_workspace_id
    AND user_id = public.current_user_id()
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
