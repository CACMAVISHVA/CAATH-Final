-- Restore tenant-scoped document access for the CAATH document workflow.
-- This keeps every authenticated user's document records limited to their firm.

CREATE TABLE IF NOT EXISTS public.document_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  category text NOT NULL,
  document_type text NOT NULL DEFAULT 'Other',
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_compliance_id uuid REFERENCES public.compliance_tasks(id) ON DELETE SET NULL,
  linked_invoice_id uuid,
  linked_notice_id uuid REFERENCES public.notices(id) ON DELETE SET NULL,
  linked_approval_id uuid REFERENCES public.approval_tasks(id) ON DELETE SET NULL,
  parent_document_id uuid REFERENCES public.document_vault(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_by_name text NOT NULL DEFAULT 'Unknown',
  ocr_status text CHECK (ocr_status IN ('PENDING', 'READY', 'FAILED')),
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  document_id uuid REFERENCES public.document_vault(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_vault_firm_created
  ON public.document_vault(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_vault_client_active
  ON public.document_vault(client_id, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_firm
  ON public.document_audit_logs(firm_id, created_at DESC);

ALTER TABLE public.document_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_vault TO authenticated;
GRANT SELECT, INSERT ON public.document_audit_logs TO authenticated;

DROP POLICY IF EXISTS document_vault_tenant_scope ON public.document_vault;
CREATE POLICY document_vault_tenant_scope
ON public.document_vault
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS document_audit_logs_tenant_scope ON public.document_audit_logs;
CREATE POLICY document_audit_logs_tenant_scope
ON public.document_audit_logs
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS documents_tenant_read ON storage.objects;
CREATE POLICY documents_tenant_read
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (public.is_god_admin() OR split_part(name, '/', 1)::uuid = public.current_user_firm_id())
);

DROP POLICY IF EXISTS documents_tenant_insert ON storage.objects;
CREATE POLICY documents_tenant_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND split_part(name, '/', 1)::uuid = public.current_user_firm_id()
);

GRANT SELECT, INSERT ON storage.objects TO authenticated;
