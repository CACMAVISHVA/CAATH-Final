BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tan text,
  ADD COLUMN IF NOT EXISTS cin_llpin text,
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS portal_usernames jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_workspace_firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL;

UPDATE public.clients
SET linked_workspace_firm_id = COALESCE(linked_workspace_firm_id, firm_id)
WHERE linked_workspace_firm_id IS NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS portal_type text CHECK (portal_type IS NULL OR portal_type IN ('GST', 'IncomeTax', 'MCA', 'TRACES')),
  ADD COLUMN IF NOT EXISTS portal_workflow_type text CHECK (portal_workflow_type IS NULL OR portal_workflow_type IN (
    'GST Filing',
    'GST Registration',
    'GST Notice',
    'Income Tax Filing',
    'Income Tax Notice',
    'Tax Payment',
    'MCA Annual Filing',
    'ROC Filing',
    'Director KYC',
    'TRACES/TDS Activities',
    'TDS Return',
    'Form 16/16A'
  )),
  ADD COLUMN IF NOT EXISTS linked_portal_event_id uuid,
  ADD COLUMN IF NOT EXISTS calendar_event_ref text;

ALTER TABLE public.portal_credentials
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tan text,
  ADD COLUMN IF NOT EXISTS cin_llpin text,
  ADD COLUMN IF NOT EXISTS vault_provider text,
  ADD COLUMN IF NOT EXISTS vault_secret_ref text;

ALTER TABLE public.portal_audit_logs
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS related_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_type text,
  ADD COLUMN IF NOT EXISTS official_url text;

UPDATE public.portal_audit_logs pal
SET firm_id = COALESCE(pal.firm_id, c.firm_id)
FROM public.clients c
WHERE pal.client_id = c.id
  AND pal.firm_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_portal_identifiers ON public.clients(firm_id, gstin, pan, tan, cin_llpin);
CREATE INDEX IF NOT EXISTS idx_tasks_portal_type ON public.tasks(firm_id, portal_type, portal_workflow_type);
CREATE INDEX IF NOT EXISTS idx_portal_credentials_client ON public.portal_credentials(client_id, portal_type);
CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_firm_portal_ts ON public.portal_audit_logs(firm_id, portal_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_related_task ON public.portal_audit_logs(related_task_id);

ALTER TABLE public.portal_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_credentials_tenant_select ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_select
ON public.portal_credentials
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = portal_credentials.client_id
      AND c.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS portal_credentials_tenant_insert ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_insert
ON public.portal_credentials
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
  )
);

DROP POLICY IF EXISTS portal_credentials_tenant_update ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_update
ON public.portal_credentials
FOR UPDATE
TO authenticated
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
  )
)
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
  )
);

DROP POLICY IF EXISTS portal_credentials_tenant_delete ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_delete
ON public.portal_credentials
FOR DELETE
TO authenticated
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND public.current_user_role() IN ('SuperAdmin', 'Admin')
  )
);

DROP POLICY IF EXISTS portal_audit_logs_select_scope ON public.portal_audit_logs;
CREATE POLICY portal_audit_logs_select_scope
ON public.portal_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = portal_audit_logs.client_id
      AND c.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS portal_audit_logs_insert_scope ON public.portal_audit_logs;
CREATE POLICY portal_audit_logs_insert_scope
ON public.portal_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = portal_audit_logs.client_id
      AND c.firm_id = public.current_user_firm_id()
  )
);

COMMIT;
