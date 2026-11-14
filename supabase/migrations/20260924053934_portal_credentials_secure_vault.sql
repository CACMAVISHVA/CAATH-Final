BEGIN;

CREATE TABLE IF NOT EXISTS public.portal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  portal_name text NOT NULL CHECK (char_length(trim(portal_name)) BETWEEN 1 AND 200),
  portal_type text NOT NULL CHECK (portal_type IN ('GST', 'MCA', 'IncomeTax', 'TRACES', 'ICEGATE', 'EPFO', 'ESIC', 'Banking', 'Custom')),
  portal_url text NOT NULL CHECK (portal_url ~* '^https?://'),
  encrypted_username text NOT NULL,
  encrypted_password text NOT NULL,
  username_masked text NOT NULL DEFAULT '***',
  gstin text,
  pan text,
  cin text,
  tan text,
  cin_llpin text,
  security_notes text,
  credential_ref text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  last_login timestamptz,
  last_filing_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, portal_type)
);

CREATE INDEX IF NOT EXISTS idx_portal_credentials_firm_client
  ON public.portal_credentials(firm_id, client_id, portal_type);
CREATE INDEX IF NOT EXISTS idx_portal_credentials_created_by
  ON public.portal_credentials(created_by);

CREATE TABLE IF NOT EXISTS public.portal_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_type text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  action text NOT NULL,
  related_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  workflow_type text,
  official_url text,
  details text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  ip_address text,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_firm_client_ts
  ON public.portal_audit_logs(firm_id, client_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_portal_type
  ON public.portal_audit_logs(portal_type);
CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_related_task
  ON public.portal_audit_logs(related_task_id);

ALTER TABLE public.portal_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_audit_logs ENABLE ROW LEVEL SECURITY;

-- Credential ciphertext is intentionally unavailable through the public Data API.
-- Only the authenticated portal-secrets Edge Function may use the service role to read it.
REVOKE ALL ON TABLE public.portal_credentials FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.portal_audit_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.portal_audit_logs TO authenticated;

DROP POLICY IF EXISTS portal_audit_logs_select_scope ON public.portal_audit_logs;
CREATE POLICY portal_audit_logs_select_scope
ON public.portal_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
);

DROP POLICY IF EXISTS portal_audit_logs_insert_scope ON public.portal_audit_logs;
CREATE POLICY portal_audit_logs_insert_scope
ON public.portal_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND user_id = public.current_user_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = portal_audit_logs.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  )
);

COMMIT;
