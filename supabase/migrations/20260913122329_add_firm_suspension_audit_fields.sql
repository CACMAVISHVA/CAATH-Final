BEGIN;

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactivated_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_suspension_reason_length_check;
ALTER TABLE public.firms
  ADD CONSTRAINT firms_suspension_reason_length_check
  CHECK (suspension_reason IS NULL OR length(trim(suspension_reason)) BETWEEN 10 AND 1000);

CREATE INDEX IF NOT EXISTS idx_firms_operational_status ON public.firms(status, suspended_at DESC);

-- Tenant-scoped policies call this helper. Returning NULL for a suspended firm
-- immediately closes that firm's data access while leaving God Admin controls intact.
CREATE OR REPLACE FUNCTION public.current_user_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.firm_id
  FROM public.users u
  LEFT JOIN public.firms f ON f.id = u.firm_id
  WHERE u.auth_id = auth.uid()
    AND u.status = 'Active'
    AND (u.role = 'GodAdmin' OR f.status = 'Active')
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_firm_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_firm_id() TO authenticated, service_role;

COMMIT;
