-- 1. Initialize Private Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspaces',
  'workspaces',
  false,                              -- Private bucket; unauthenticated public access denied
  104857600,                          -- 100 MB maximum file size limit
  ARRAY[                              -- Allowed business MIME types
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 104857600;

-- 2. Storage Row Level Security Policies on storage.objects
-- SELECT Policy (Read / Download / Generate Signed URL)
DROP POLICY IF EXISTS "storage_select_tenant_member" ON storage.objects;
CREATE POLICY "storage_select_tenant_member" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workspaces' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    public.has_active_membership((storage.foldername(name))[2])
  );

-- INSERT Policy (Upload New File)
DROP POLICY IF EXISTS "storage_insert_tenant_contributor" ON storage.objects;
CREATE POLICY "storage_insert_tenant_contributor" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workspaces' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    public.has_active_membership((storage.foldername(name))[2]) AND
    public.get_workspace_role((storage.foldername(name))[2]) IN (
      'owner', 'admin', 'manager', 'contributor', 'finance'
    )
  );

-- DELETE Policy (Remove File)
DROP POLICY IF EXISTS "storage_delete_tenant_admin" ON storage.objects;
CREATE POLICY "storage_delete_tenant_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'workspaces' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    public.has_active_membership((storage.foldername(name))[2]) AND
    public.get_workspace_role((storage.foldername(name))[2]) IN ('owner', 'admin')
  );

-- UPDATE Policy (Deny all in-place modifications to uphold immutability)
DROP POLICY IF EXISTS "storage_update_deny_all" ON storage.objects;
CREATE POLICY "storage_update_deny_all" ON storage.objects
  FOR UPDATE USING (false);

-- 3. Stored Assets Metadata Table
CREATE TABLE IF NOT EXISTS public.tenant_storage_objects (
  id text NOT NULL,
  workspace_id text NOT NULL REFERENCES public.workspace_tenants(id) ON DELETE RESTRICT,
  bucket_id text NOT NULL DEFAULT 'workspaces' CHECK (bucket_id = 'workspaces'),
  storage_path text NOT NULL,
  content_type text NOT NULL CHECK (char_length(content_type) BETWEEN 1 AND 128),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 104857600),
  sha256_hash text NOT NULL CHECK (sha256_hash ~ '^[a-f0-9]{64}$'),
  access_tier text NOT NULL DEFAULT 'private' CHECK (access_tier = 'private'),
  owning_entity_type text NOT NULL CHECK (owning_entity_type IN ('invoice', 'receipt', 'contract', 'project', 'profile')),
  owning_entity_id text NOT NULL CHECK (char_length(owning_entity_id) BETWEEN 1 AND 128),
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  PRIMARY KEY (workspace_id, id),
  CONSTRAINT uq_storage_path_workspace UNIQUE (workspace_id, storage_path)
);

-- Enable & Force RLS on tenant_storage_objects
ALTER TABLE public.tenant_storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_storage_objects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_objects_select_member" ON public.tenant_storage_objects;
CREATE POLICY "storage_objects_select_member" ON public.tenant_storage_objects
  FOR SELECT USING (public.has_active_membership(workspace_id));

DROP POLICY IF EXISTS "storage_objects_insert_contributor" ON public.tenant_storage_objects;
CREATE POLICY "storage_objects_insert_contributor" ON public.tenant_storage_objects
  FOR INSERT WITH CHECK (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor', 'finance')
  );

DROP POLICY IF EXISTS "storage_objects_delete_admin" ON public.tenant_storage_objects;
CREATE POLICY "storage_objects_delete_admin" ON public.tenant_storage_objects
  FOR DELETE USING (
    public.has_active_membership(workspace_id) AND
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
  );
