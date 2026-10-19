# Relational Schema Contract: F008 Tenant Isolation & RLS

**Date**: 2026-10-19  
**Feature**: [F008 — Managed Backend and Tenant Isolation](../spec.md)  
**Parent Contract**: [Data Model](../data-model.md)  
**Status**: Authoritative PostgreSQL Schema & Security Specification

---

## 1. Architectural Scope

This contract defines the PostgreSQL 16+ relational schema, integrity constraints, triggers, and Row Level Security (RLS) policies enforcing multi-tenant isolation across all SoloDesk cloud database tables.

### 1.1. Invariants

1. **Tenant Exclusivity**: No database operation (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `COUNT`, `SUM`, full-text search) executed by a user authenticated in Workspace A may inspect, mutate, count, or reveal the existence of any record in Workspace B.
2. **Key Immutability**: The `workspace_id` column of every record is strictly immutable after creation.
3. **Composite Integrity**: All child tables enforce composite foreign keys linking `(workspace_id, parent_id)` to prevent cross-tenant pointer poisoning.
4. **Ownership Continuity**: A workspace must have at least one active member in the `owner` role at all times.
5. **Real-Time Evaluation**: Role checks and membership status are evaluated live on each statement via security-definer helper functions, ensuring instant revocation without waiting for token expiration.

---

## 2. PostgreSQL DDL Specification

### 2.1. Tenant Administration Schema

```sql
-- Workspace Tenants Table
CREATE TABLE public.workspace_tenants (
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
CREATE TABLE public.workspace_memberships (
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
CREATE TABLE public.tenant_audit_events (
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
```

### 2.2. Domain Composite Reference Tables

```sql
-- Clients
CREATE TABLE public.clients (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  currency text NOT NULL CHECK (char_length(currency) = 3),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, id)
);

-- Projects (Composite FK to Clients)
CREATE TABLE public.projects (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  id text NOT NULL,
  client_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, id),
  CONSTRAINT fk_projects_client FOREIGN KEY (workspace_id, client_id)
    REFERENCES public.clients(workspace_id, id) ON DELETE RESTRICT
);

-- Tasks (Composite FK to Projects)
CREATE TABLE public.tasks (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  id text NOT NULL,
  project_id text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (workspace_id, project_id)
    REFERENCES public.projects(workspace_id, id) ON DELETE CASCADE
);

-- Time Entries (Composite FK to Tasks)
CREATE TABLE public.time_entries (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  id text NOT NULL,
  task_id text NOT NULL,
  user_id text NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 86400),
  work_date date NOT NULL,
  billable boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'billed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, id),
  CONSTRAINT fk_time_entries_task FOREIGN KEY (workspace_id, task_id)
    REFERENCES public.tasks(workspace_id, id) ON DELETE RESTRICT
);
```

---

## 3. Triggers and Enforcement Functions

### 3.1. Universal Workspace Immutability Trigger

```sql
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
```

### 3.2. Last Owner Protection Trigger

```sql
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
```

---

## 4. Row Level Security Policy Specifications

### 4.1. Helper Functions (Security Definer)

```sql
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
```

### 4.2. Concrete Table Policies

```sql
-- workspace_tenants Policies
CREATE POLICY "tenants_select_member" ON public.workspace_tenants
  FOR SELECT USING (public.has_active_membership(id));

CREATE POLICY "tenants_update_admin" ON public.workspace_tenants
  FOR UPDATE USING (
    public.has_active_membership(id) AND
    public.get_workspace_role(id) IN ('owner', 'admin')
  );

-- workspace_memberships Policies
CREATE POLICY "memberships_select_member" ON public.workspace_memberships
  FOR SELECT USING (public.has_active_membership(workspace_id));

CREATE POLICY "memberships_insert_admin" ON public.workspace_memberships
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

CREATE POLICY "memberships_update_admin" ON public.workspace_memberships
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

CREATE POLICY "memberships_delete_admin" ON public.workspace_memberships
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- clients Policies
CREATE POLICY "clients_select_member" ON public.clients
  FOR SELECT USING (public.has_active_membership(workspace_id));

CREATE POLICY "clients_insert_manager" ON public.clients
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "clients_update_manager" ON public.clients
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- projects Policies
CREATE POLICY "projects_select_member" ON public.projects
  FOR SELECT USING (public.has_active_membership(workspace_id));

CREATE POLICY "projects_insert_manager" ON public.projects
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "projects_update_manager" ON public.projects
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- tasks Policies
CREATE POLICY "tasks_select_member" ON public.tasks
  FOR SELECT USING (public.has_active_membership(workspace_id));

CREATE POLICY "tasks_insert_contributor" ON public.tasks
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
  );

CREATE POLICY "tasks_update_contributor" ON public.tasks
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
  );

CREATE POLICY "tasks_delete_manager" ON public.tasks
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

-- time_entries Policies
CREATE POLICY "time_entries_select_member" ON public.time_entries
  FOR SELECT USING (public.has_active_membership(workspace_id));

CREATE POLICY "time_entries_insert_contributor" ON public.time_entries
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    user_id = public.current_user_id() AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
  );

CREATE POLICY "time_entries_update_owner_or_manager" ON public.time_entries
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND (
      user_id = public.current_user_id() OR
      public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "time_entries_delete_owner_or_admin" ON public.time_entries
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND (
      user_id = public.current_user_id() OR
      public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    )
  );

-- tenant_audit_events Policies (Read-only for Admins/Owners; No direct client mutation)
CREATE POLICY "audit_select_admin" ON public.tenant_audit_events
  FOR SELECT USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );
```

---

## 5. Security & Verification Assertions

1. **Deny by Default**: Any query without an authenticated JWT (`auth.uid() IS NULL`) or where `has_active_membership(workspace_id)` evaluates to `false` returns zero rows on `SELECT` and rejects `INSERT`/`UPDATE`/`DELETE` operations.
2. **Deterministic Error Handling**: Cross-tenant violations during mutations reject with PostgreSQL error code `42501` (`insufficient_privilege`) or `23503` (`foreign_key_violation`), triggering the domain gateway to return a canonical `FORBIDDEN` or `RESOURCE_UNAVAILABLE` F003 `PublicError`.
