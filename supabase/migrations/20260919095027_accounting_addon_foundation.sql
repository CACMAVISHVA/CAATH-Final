BEGIN;

CREATE TABLE IF NOT EXISTS public.accounting_addon_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Suspended', 'Declined')),
  plan text NOT NULL DEFAULT 'Client Books' CHECK (plan IN ('Client Books', 'Client Books Pro')),
  monthly_price numeric(12,2),
  requested_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_addon_workspace_unique_client UNIQUE (firm_id, client_id),
  CONSTRAINT accounting_addon_workspace_price_nonnegative CHECK (monthly_price IS NULL OR monthly_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_accounting_addon_workspaces_firm_status
  ON public.accounting_addon_workspaces(firm_id, status, requested_at DESC);

ALTER TABLE public.accounting_addon_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.accounting_addon_workspaces FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.accounting_addon_workspaces TO authenticated;

DROP POLICY IF EXISTS accounting_addon_workspace_read ON public.accounting_addon_workspaces;
CREATE POLICY accounting_addon_workspace_read
ON public.accounting_addon_workspaces
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
);

DROP POLICY IF EXISTS accounting_addon_workspace_request ON public.accounting_addon_workspaces;
CREATE POLICY accounting_addon_workspace_request
ON public.accounting_addon_workspaces
FOR INSERT
TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND requested_by = public.current_user_profile_id()
  AND public.current_user_role() = 'SuperAdmin'
  AND status = 'Pending'
  AND monthly_price IS NULL
  AND approved_by IS NULL
  AND activated_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS accounting_addon_workspace_platform_manage ON public.accounting_addon_workspaces;
CREATE POLICY accounting_addon_workspace_platform_manage
ON public.accounting_addon_workspaces
FOR UPDATE
TO authenticated
USING (public.is_god_admin())
WITH CHECK (public.is_god_admin());

COMMIT;
