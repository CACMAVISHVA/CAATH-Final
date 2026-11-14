BEGIN;

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS suspension_effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_mode text;

ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_suspension_mode_check;
ALTER TABLE public.firms
  ADD CONSTRAINT firms_suspension_mode_check
  CHECK (suspension_mode IS NULL OR suspension_mode IN ('Grace Period', 'Immediate Security'));

-- Preserve the meaning of any suspension created before grace periods existed.
UPDATE public.firms
SET suspension_effective_at = COALESCE(suspended_at, now()),
    suspension_mode = 'Immediate Security'
WHERE status = 'Suspended' AND suspension_effective_at IS NULL;

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
    AND (
      u.role = 'GodAdmin'
      OR f.status = 'Active'
      OR (f.status = 'Suspended' AND f.suspension_effective_at > now())
    )
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_firm_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_firm_id() TO authenticated, service_role;

COMMIT;
