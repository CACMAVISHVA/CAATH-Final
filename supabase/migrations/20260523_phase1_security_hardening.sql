BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.portal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  portal_name text NOT NULL,
  portal_type text NOT NULL DEFAULT 'Custom',
  portal_url text NOT NULL,
  encrypted_username text NOT NULL,
  encrypted_password text NOT NULL,
  username_masked text NOT NULL DEFAULT '***',
  gstin text,
  pan text,
  cin text,
  security_notes text,
  credential_ref text UNIQUE,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  last_login timestamptz,
  last_filing_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_credentials_firm_id ON public.portal_credentials(firm_id);
CREATE INDEX IF NOT EXISTS idx_portal_credentials_portal_name ON public.portal_credentials(firm_id, portal_name);
CREATE INDEX IF NOT EXISTS idx_portal_credentials_created_by ON public.portal_credentials(created_by);

CREATE TABLE IF NOT EXISTS public.portal_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  portal_type text NOT NULL,
  action text NOT NULL,
  details text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  ip_address text,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_client_ts ON public.portal_audit_logs(client_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_portal_type ON public.portal_audit_logs(portal_type);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS ip_metadata jsonb,
  ADD COLUMN IF NOT EXISTS device_metadata jsonb;

UPDATE public.audit_logs
SET actor_id = COALESCE(actor_id, user_id),
    actor_role = COALESCE(actor_role, user_role),
    tenant_id = COALESCE(tenant_id, firm_id)
WHERE actor_id IS NULL OR actor_role IS NULL OR tenant_id IS NULL;

ALTER TABLE public.portal_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_credentials_tenant_select ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_select
ON public.portal_credentials
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR firm_id::text = (auth.jwt()->>'firm_id')
);

DROP POLICY IF EXISTS portal_credentials_tenant_insert ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_insert
ON public.portal_credentials
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR (
    firm_id::text = (auth.jwt()->>'firm_id')
    AND (auth.jwt()->>'role') IN ('SuperAdmin', 'Admin', 'Staff')
  )
);

DROP POLICY IF EXISTS portal_credentials_tenant_update ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_update
ON public.portal_credentials
FOR UPDATE
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR (
    firm_id::text = (auth.jwt()->>'firm_id')
    AND (auth.jwt()->>'role') IN ('SuperAdmin', 'Admin', 'Staff')
  )
)
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR (
    firm_id::text = (auth.jwt()->>'firm_id')
    AND (auth.jwt()->>'role') IN ('SuperAdmin', 'Admin', 'Staff')
  )
);

DROP POLICY IF EXISTS portal_credentials_tenant_delete ON public.portal_credentials;
CREATE POLICY portal_credentials_tenant_delete
ON public.portal_credentials
FOR DELETE
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR (
    firm_id::text = (auth.jwt()->>'firm_id')
    AND (auth.jwt()->>'role') IN ('SuperAdmin', 'Admin')
  )
);

DROP POLICY IF EXISTS portal_audit_logs_select_scope ON public.portal_audit_logs;
CREATE POLICY portal_audit_logs_select_scope
ON public.portal_audit_logs
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = portal_audit_logs.client_id
      AND c.firm_id::text = (auth.jwt()->>'firm_id')
  )
);

DROP POLICY IF EXISTS portal_audit_logs_insert_scope ON public.portal_audit_logs;
CREATE POLICY portal_audit_logs_insert_scope
ON public.portal_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = portal_audit_logs.client_id
      AND c.firm_id::text = (auth.jwt()->>'firm_id')
  )
);

DO $$
BEGIN
  IF to_regclass('public.tickets') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tickets_tenant_scope ON public.tickets';
    EXECUTE 'CREATE POLICY tickets_tenant_scope ON public.tickets FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;

  IF to_regclass('public.gst_modules') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.gst_modules ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS gst_modules_tenant_scope ON public.gst_modules';
    EXECUTE 'CREATE POLICY gst_modules_tenant_scope ON public.gst_modules FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;
END $$;

DROP POLICY IF EXISTS documents_phase1_tenant_scope ON public.documents;
CREATE POLICY documents_phase1_tenant_scope
ON public.documents
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR firm_id::text = (auth.jwt()->>'firm_id')
)
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR firm_id::text = (auth.jwt()->>'firm_id')
);

DROP POLICY IF EXISTS billing_phase1_tenant_scope ON public.billing;
CREATE POLICY billing_phase1_tenant_scope
ON public.billing
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR firm_id::text = (auth.jwt()->>'firm_id')
)
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR firm_id::text = (auth.jwt()->>'firm_id')
);

DROP POLICY IF EXISTS audit_logs_phase1_tenant_scope ON public.audit_logs;
CREATE POLICY audit_logs_phase1_tenant_scope
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR COALESCE(tenant_id, firm_id)::text = (auth.jwt()->>'firm_id')
)
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR COALESCE(tenant_id, firm_id)::text = (auth.jwt()->>'firm_id')
);

COMMIT;
