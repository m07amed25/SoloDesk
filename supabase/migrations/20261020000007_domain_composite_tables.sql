-- Migration 20261020000007_domain_composite_tables.sql
-- Domain tables with composite primary/foreign keys (workspace_id, id) and RLS policies

-- 1. Clients
CREATE TABLE IF NOT EXISTS public.clients (
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  currency text NOT NULL CHECK (char_length(currency) = 3),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, id)
);

-- 2. Projects (Composite FK to Clients)
CREATE TABLE IF NOT EXISTS public.projects (
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

-- 3. Tasks (Composite FK to Projects, Cascading delete)
CREATE TABLE IF NOT EXISTS public.tasks (
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

-- 4. Time Entries (Composite FK to Tasks)
CREATE TABLE IF NOT EXISTS public.time_entries (
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

-- 5. Attach Universal Workspace ID Immutability Triggers
DROP TRIGGER IF EXISTS trg_immutable_clients ON public.clients;
CREATE TRIGGER trg_immutable_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_workspace_id_mutation();

DROP TRIGGER IF EXISTS trg_immutable_projects ON public.projects;
CREATE TRIGGER trg_immutable_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_workspace_id_mutation();

DROP TRIGGER IF EXISTS trg_immutable_tasks ON public.tasks;
CREATE TRIGGER trg_immutable_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_workspace_id_mutation();

DROP TRIGGER IF EXISTS trg_immutable_time_entries ON public.time_entries;
CREATE TRIGGER trg_immutable_time_entries
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_workspace_id_mutation();

-- 6. Enable & Force Row Level Security on Domain Tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries FORCE ROW LEVEL SECURITY;

-- 7. Concrete RLS Policies for Domain Tables
-- clients
DROP POLICY IF EXISTS "clients_select_member" ON public.clients;
CREATE POLICY "clients_select_member" ON public.clients
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "clients_insert_manager" ON public.clients;
CREATE POLICY "clients_insert_manager" ON public.clients
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "clients_update_manager" ON public.clients;
CREATE POLICY "clients_update_manager" ON public.clients
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "clients_delete_admin" ON public.clients;
CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- projects
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
CREATE POLICY "projects_select_member" ON public.projects
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "projects_insert_manager" ON public.projects;
CREATE POLICY "projects_insert_manager" ON public.projects
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "projects_update_manager" ON public.projects;
CREATE POLICY "projects_update_manager" ON public.projects
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "projects_delete_admin" ON public.projects;
CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- tasks
DROP POLICY IF EXISTS "tasks_select_member" ON public.tasks;
CREATE POLICY "tasks_select_member" ON public.tasks
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "tasks_insert_contributor" ON public.tasks;
CREATE POLICY "tasks_insert_contributor" ON public.tasks
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
  );

DROP POLICY IF EXISTS "tasks_update_contributor" ON public.tasks;
CREATE POLICY "tasks_update_contributor" ON public.tasks
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
  );

DROP POLICY IF EXISTS "tasks_delete_manager" ON public.tasks;
CREATE POLICY "tasks_delete_manager" ON public.tasks
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
  );

-- time_entries
DROP POLICY IF EXISTS "time_entries_select_member" ON public.time_entries;
CREATE POLICY "time_entries_select_member" ON public.time_entries
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "time_entries_insert_contributor" ON public.time_entries;
CREATE POLICY "time_entries_insert_contributor" ON public.time_entries
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    user_id = public.current_user_id() AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
  );

DROP POLICY IF EXISTS "time_entries_update_owner_or_manager" ON public.time_entries;
CREATE POLICY "time_entries_update_owner_or_manager" ON public.time_entries
  FOR UPDATE USING (
    public.has_active_membership(workspace_id) AND (
      user_id = public.current_user_id() OR
      public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "time_entries_delete_owner_or_admin" ON public.time_entries;
CREATE POLICY "time_entries_delete_owner_or_admin" ON public.time_entries
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND (
      user_id = public.current_user_id() OR
      public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    )
  );
