BEGIN;

CREATE TABLE IF NOT EXISTS public.gst_gsp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  provider_code text NOT NULL CHECK (char_length(btrim(provider_code)) BETWEEN 2 AND 60),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  status text NOT NULL DEFAULT 'Awaiting Provider' CHECK (status IN ('Awaiting Provider', 'Configured', 'Verified', 'Suspended', 'Disconnected')),
  consent_status text NOT NULL DEFAULT 'Active' CHECK (consent_status IN ('Active', 'Revoked', 'Expired')),
  consent_version text NOT NULL DEFAULT 'gst-api-consent-v1',
  consent_scope jsonb NOT NULL DEFAULT '["returns.read","notices.read","challans.read"]'::jsonb,
  consent_granted_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  consent_granted_at timestamptz NOT NULL DEFAULT now(),
  consent_expires_at timestamptz,
  consent_revoked_at timestamptz,
  last_verified_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, client_id, provider_code, environment)
);

CREATE TABLE IF NOT EXISTS public.gst_gsp_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.gst_gsp_connections(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('FETCH_RETURNS', 'FETCH_NOTICES', 'FETCH_CHALLANS', 'FILE_RETURN', 'GENERATE_CHALLAN', 'CHECK_STATUS')),
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_reference text,
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  requested_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_gst_gsp_connections_firm_status ON public.gst_gsp_connections(firm_id, status, consent_status);
CREATE INDEX IF NOT EXISTS idx_gst_gsp_sync_jobs_connection_created ON public.gst_gsp_sync_jobs(connection_id, created_at DESC);

ALTER TABLE public.gst_gsp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_gsp_sync_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gst_gsp_connections, public.gst_gsp_sync_jobs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.gst_gsp_connections TO authenticated;
GRANT UPDATE (consent_status, consent_revoked_at, updated_at) ON public.gst_gsp_connections TO authenticated;
GRANT SELECT ON public.gst_gsp_sync_jobs TO authenticated;

DROP POLICY IF EXISTS gst_gsp_connections_read ON public.gst_gsp_connections;
CREATE POLICY gst_gsp_connections_read ON public.gst_gsp_connections FOR SELECT TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id());
DROP POLICY IF EXISTS gst_gsp_connections_create ON public.gst_gsp_connections;
CREATE POLICY gst_gsp_connections_create ON public.gst_gsp_connections FOR INSERT TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND public.current_user_role() = 'SuperAdmin'
  AND consent_granted_by = public.current_user_profile_id()
  AND environment = 'sandbox'
  AND status = 'Awaiting Provider'
  AND consent_status = 'Active'
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id() AND c.gstin = gstin)
);
DROP POLICY IF EXISTS gst_gsp_connections_revoke ON public.gst_gsp_connections;
CREATE POLICY gst_gsp_connections_revoke ON public.gst_gsp_connections FOR UPDATE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
WITH CHECK (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS gst_gsp_sync_jobs_read ON public.gst_gsp_sync_jobs;
CREATE POLICY gst_gsp_sync_jobs_read ON public.gst_gsp_sync_jobs FOR SELECT TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id());

COMMIT;
