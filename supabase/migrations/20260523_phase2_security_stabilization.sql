BEGIN;

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  actor_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, actor_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_scope_actor_window
  ON public.security_rate_limits(scope, actor_key, window_start DESC);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_rate_limits_deny_client_access ON public.security_rate_limits;
CREATE POLICY security_rate_limits_deny_client_access
ON public.security_rate_limits
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

ALTER TABLE public.gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gstr_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_mismatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gst_invoices_tenant_scope ON public.gst_invoices;
CREATE POLICY gst_invoices_tenant_scope ON public.gst_invoices
FOR ALL TO authenticated
USING ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'))
WITH CHECK ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'));

DROP POLICY IF EXISTS gstr_filings_tenant_scope ON public.gstr_filings;
CREATE POLICY gstr_filings_tenant_scope ON public.gstr_filings
FOR ALL TO authenticated
USING ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'))
WITH CHECK ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'));

DROP POLICY IF EXISTS gst_reconciliations_tenant_scope ON public.gst_reconciliations;
CREATE POLICY gst_reconciliations_tenant_scope ON public.gst_reconciliations
FOR ALL TO authenticated
USING ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'))
WITH CHECK ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'));

DROP POLICY IF EXISTS gst_mismatches_tenant_scope ON public.gst_mismatches;
CREATE POLICY gst_mismatches_tenant_scope ON public.gst_mismatches
FOR ALL TO authenticated
USING (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR EXISTS (
    SELECT 1 FROM public.gst_reconciliations gr
    WHERE gr.id = gst_mismatches.reconciliation_id
      AND gr.firm_id::text = (auth.jwt()->>'firm_id')
  )
)
WITH CHECK (
  (auth.jwt()->>'role') = 'GodAdmin'
  OR EXISTS (
    SELECT 1 FROM public.gst_reconciliations gr
    WHERE gr.id = gst_mismatches.reconciliation_id
      AND gr.firm_id::text = (auth.jwt()->>'firm_id')
  )
);

DO $$
BEGIN
  IF to_regclass('public.workforce_profiles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.workforce_profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS workforce_profiles_tenant_scope ON public.workforce_profiles';
    EXECUTE 'CREATE POLICY workforce_profiles_tenant_scope ON public.workforce_profiles FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;

  IF to_regclass('public.salary_structures') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS salary_structures_tenant_scope ON public.salary_structures';
    EXECUTE 'CREATE POLICY salary_structures_tenant_scope ON public.salary_structures FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;

  IF to_regclass('public.payroll_runs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS payroll_runs_tenant_scope ON public.payroll_runs';
    EXECUTE 'CREATE POLICY payroll_runs_tenant_scope ON public.payroll_runs FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;

  IF to_regclass('public.payroll_approval_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.payroll_approval_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS payroll_approval_logs_tenant_scope ON public.payroll_approval_logs';
    EXECUTE 'CREATE POLICY payroll_approval_logs_tenant_scope ON public.payroll_approval_logs FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;

  IF to_regclass('public.compensation_change_history') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.compensation_change_history ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS compensation_change_history_tenant_scope ON public.compensation_change_history';
    EXECUTE 'CREATE POLICY compensation_change_history_tenant_scope ON public.compensation_change_history FOR ALL TO authenticated USING ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id'')) WITH CHECK ((auth.jwt()->>''role'') = ''GodAdmin'' OR firm_id::text = (auth.jwt()->>''firm_id''))';
  END IF;
END $$;

COMMIT;
