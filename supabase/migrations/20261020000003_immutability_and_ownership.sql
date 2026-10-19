-- Migration 20261020000003_immutability_and_ownership.sql
-- Immutability and ownership triggers: reject_workspace_id_mutation & prevent_last_owner_removal

-- Universal Workspace Immutability Trigger Function
CREATE OR REPLACE FUNCTION public.reject_workspace_id_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'Immutable workspace_id: tenant ownership cannot be modified on existing records (old: %, new: %)',
      OLD.workspace_id, NEW.workspace_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Last Owner Protection Trigger Function
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_other_active_owners integer;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner' AND OLD.status = 'active') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND OLD.status = 'active' AND
      (NEW.role <> 'owner' OR NEW.status <> 'active')) THEN

    SELECT count(*) INTO v_other_active_owners
    FROM public.workspace_memberships
    WHERE workspace_id = OLD.workspace_id
      AND role = 'owner'
      AND status = 'active'
      AND user_id <> OLD.user_id;

    IF v_other_active_owners < 1 THEN
      RAISE EXCEPTION 'Ownership continuity violation: cannot remove, revoke, or downgrade the sole workspace Owner. Ownership must be transferred to another active member first.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach prevent_last_owner_removal to workspace_memberships
DROP TRIGGER IF EXISTS trg_prevent_last_owner ON public.workspace_memberships;
CREATE TRIGGER trg_prevent_last_owner
  BEFORE UPDATE OR DELETE ON public.workspace_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_owner_removal();

-- Attach reject_workspace_id_mutation to workspace_memberships
DROP TRIGGER IF EXISTS trg_immutable_membership_workspace ON public.workspace_memberships;
CREATE TRIGGER trg_immutable_membership_workspace
  BEFORE UPDATE ON public.workspace_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_workspace_id_mutation();

-- Universal Tenant ID Immutability for workspace_tenants
CREATE OR REPLACE FUNCTION public.reject_tenant_id_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Immutable workspace tenant id: cannot modify tenant identifier (old: %, new: %)',
      OLD.id, NEW.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_tenant_id ON public.workspace_tenants;
CREATE TRIGGER trg_immutable_tenant_id
  BEFORE UPDATE ON public.workspace_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_tenant_id_mutation();

