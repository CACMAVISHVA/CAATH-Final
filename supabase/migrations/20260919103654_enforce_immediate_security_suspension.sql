BEGIN;

-- Immediate security suspensions must never depend on client/server clock
-- alignment. Grace-period access is allowed only when the mode is explicitly
-- Grace Period and its effective timestamp is still in the future.
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
      OR (
        f.status = 'Suspended'
        AND f.suspension_mode = 'Grace Period'
        AND f.suspension_effective_at > now()
      )
    )
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_firm_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_firm_id() TO authenticated, service_role;

COMMIT;
