BEGIN;

CREATE OR REPLACE FUNCTION public.get_subscription_status(p_firm_id uuid DEFAULT public.current_user_firm_id())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT f.subscription_status FROM public.firms f WHERE f.id = p_firm_id LIMIT 1),
    'Inactive'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_feature(p_feature text, p_firm_id uuid DEFAULT public.current_user_firm_id())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_subscription_status(p_firm_id) = 'Active'
    OR p_feature IN ('dashboard', 'billing', 'subscription')
$$;

CREATE OR REPLACE FUNCTION public.get_remaining_limits(p_firm_id uuid DEFAULT public.current_user_firm_id())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH firm_limits AS (
    SELECT
      COALESCE(max_admins, 1) AS max_admins,
      COALESCE(max_staff, 3) AS max_staff,
      COALESCE(max_clients, 25) AS max_clients
    FROM public.firms
    WHERE id = p_firm_id
  ),
  usage AS (
    SELECT
      COUNT(*) FILTER (WHERE role = 'Admin' AND status = 'Active')::integer AS admin_count,
      COUNT(*) FILTER (WHERE role = 'Staff' AND status = 'Active')::integer AS staff_count
    FROM public.users
    WHERE firm_id = p_firm_id
  ),
  clients_usage AS (
    SELECT COUNT(*)::integer AS client_count
    FROM public.clients
    WHERE firm_id = p_firm_id
  )
  SELECT jsonb_build_object(
    'admins', jsonb_build_object(
      'limit', firm_limits.max_admins,
      'used', usage.admin_count,
      'remaining', GREATEST(firm_limits.max_admins - usage.admin_count, 0)
    ),
    'staff', jsonb_build_object(
      'limit', firm_limits.max_staff,
      'used', usage.staff_count,
      'remaining', GREATEST(firm_limits.max_staff - usage.staff_count, 0)
    ),
    'clients', jsonb_build_object(
      'limit', firm_limits.max_clients,
      'used', clients_usage.client_count,
      'remaining', GREATEST(firm_limits.max_clients - clients_usage.client_count, 0)
    )
  )
  FROM firm_limits, usage, clients_usage
$$;

CREATE OR REPLACE FUNCTION public."getSubscriptionStatus"(p_firm_id uuid DEFAULT public.current_user_firm_id())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_subscription_status(p_firm_id)
$$;

CREATE OR REPLACE FUNCTION public."canAccessFeature"(p_feature text, p_firm_id uuid DEFAULT public.current_user_firm_id())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_feature(p_feature, p_firm_id)
$$;

CREATE OR REPLACE FUNCTION public."getRemainingLimits"(p_firm_id uuid DEFAULT public.current_user_firm_id())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_remaining_limits(p_firm_id)
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_feature(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_remaining_limits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public."getSubscriptionStatus"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public."canAccessFeature"(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public."getRemainingLimits"(uuid) TO authenticated;

COMMIT;
