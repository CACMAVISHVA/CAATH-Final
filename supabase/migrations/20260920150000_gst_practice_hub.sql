BEGIN;

CREATE TABLE IF NOT EXISTS public.gst_return_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  financial_year text NOT NULL CHECK (financial_year ~ '^20[0-9]{2}-[0-9]{2}$'),
  return_type text NOT NULL CHECK (return_type IN ('GSTR-1','GSTR-3B','GSTR-2A','GSTR-2B','GSTR-9','GSTR-9C','CMP-08')),
  tax_period text NOT NULL CHECK (char_length(btrim(tax_period)) BETWEEN 3 AND 20),
  status text NOT NULL DEFAULT 'Unknown' CHECK (status IN ('Filed','Pending','Not Applicable','Unknown')),
  filed_on date,
  arn text CHECK (arn IS NULL OR char_length(btrim(arn)) BETWEEN 5 AND 50),
  source text NOT NULL DEFAULT 'Manual' CHECK (source IN ('Manual','Portal Import','GSP')),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, client_id, financial_year, return_type, tax_period)
);

CREATE TABLE IF NOT EXISTS public.gst_client_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Revoked','Expired')),
  authorization_version text NOT NULL DEFAULT 'gst-practice-authorization-v1',
  authorization_scope jsonb NOT NULL DEFAULT '["portal.login","returns.read","returns.download","reconciliation.prepare"]'::jsonb,
  confirmed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  expires_on date,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gst_client_active_authorization
  ON public.gst_client_authorizations(firm_id, client_id)
  WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_gst_return_statuses_firm_period ON public.gst_return_statuses(firm_id, financial_year, tax_period, status);
CREATE INDEX IF NOT EXISTS idx_gst_client_authorizations_firm_status ON public.gst_client_authorizations(firm_id, status);

ALTER TABLE public.gst_return_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_client_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gst_return_statuses, public.gst_client_authorizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gst_return_statuses TO authenticated;
GRANT SELECT, INSERT ON public.gst_client_authorizations TO authenticated;
GRANT UPDATE (status, revoked_at, updated_at) ON public.gst_client_authorizations TO authenticated;

DROP POLICY IF EXISTS gst_return_statuses_read ON public.gst_return_statuses;
CREATE POLICY gst_return_statuses_read ON public.gst_return_statuses FOR SELECT TO authenticated
USING (firm_id = public.current_user_firm_id());
DROP POLICY IF EXISTS gst_return_statuses_create ON public.gst_return_statuses;
CREATE POLICY gst_return_statuses_create ON public.gst_return_statuses FOR INSERT TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND updated_by = public.current_user_profile_id()
  AND public.current_user_role() IN ('SuperAdmin','Admin','Staff')
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id() AND c.gstin = gstin)
);
DROP POLICY IF EXISTS gst_return_statuses_update ON public.gst_return_statuses;
CREATE POLICY gst_return_statuses_update ON public.gst_return_statuses FOR UPDATE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin','Admin','Staff'))
WITH CHECK (firm_id = public.current_user_firm_id() AND updated_by = public.current_user_profile_id());

DROP POLICY IF EXISTS gst_client_authorizations_read ON public.gst_client_authorizations;
CREATE POLICY gst_client_authorizations_read ON public.gst_client_authorizations FOR SELECT TO authenticated
USING (firm_id = public.current_user_firm_id());
DROP POLICY IF EXISTS gst_client_authorizations_create ON public.gst_client_authorizations;
CREATE POLICY gst_client_authorizations_create ON public.gst_client_authorizations FOR INSERT TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND confirmed_by = public.current_user_profile_id()
  AND public.current_user_role() IN ('SuperAdmin','Admin')
  AND status = 'Active'
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id() AND c.gstin = gstin)
);
DROP POLICY IF EXISTS gst_client_authorizations_update ON public.gst_client_authorizations;
CREATE POLICY gst_client_authorizations_update ON public.gst_client_authorizations FOR UPDATE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin','Admin'))
WITH CHECK (firm_id = public.current_user_firm_id() AND status IN ('Revoked','Expired'));

COMMIT;
