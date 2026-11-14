BEGIN;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_status text;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_client_limit_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_client_limit_check CHECK (client_limit >= -1);
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_staff_limit_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_staff_limit_check CHECK (staff_limit >= -1);

CREATE OR REPLACE FUNCTION public.create_workspace_owner(
  p_firm_name text,
  p_full_name text,
  p_email text,
  p_mobile text,
  p_gstin text,
  p_subscription_plan text,
  p_subscription_status text,
  p_subscription_start_date timestamptz,
  p_subscription_expiry_date timestamptz,
  p_max_admins integer,
  p_max_staff integer,
  p_max_clients integer
)
RETURNS TABLE(firm_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id uuid := auth.uid();
  v_auth_email text;
  v_firm_id uuid := gen_random_uuid();
  v_user_id uuid := gen_random_uuid();
  v_workspace_base text;
  v_workspace_code text;
  v_trial_start timestamptz := now();
  v_trial_end timestamptz := now() + interval '15 days';
BEGIN
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Workspace registration requires an authenticated session.' USING ERRCODE = '28000';
  END IF;

  SELECT email INTO v_auth_email FROM auth.users WHERE id = v_auth_id;
  IF v_auth_email IS NULL OR lower(trim(v_auth_email)) <> lower(trim(p_email)) THEN
    RAISE EXCEPTION 'Workspace registration identity mismatch.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = v_auth_id) THEN
    RAISE EXCEPTION 'A CAATH profile already exists for this account.' USING ERRCODE = '23505';
  END IF;

  v_workspace_base := upper(substr(regexp_replace(coalesce(nullif(trim(p_firm_name), ''), 'CAATH'), '[^A-Za-z0-9]+', '', 'g'), 1, 8));
  IF v_workspace_base = '' THEN v_workspace_base := 'CAATH'; END IF;
  v_workspace_code := v_workspace_base || '-' || substr(v_firm_id::text, 1, 5);

  INSERT INTO public.firms (
    id, name, firm_name, workspace_code, gstin, status,
    subscription_plan, subscription_status, subscription_start_date,
    subscription_expiry_date, max_admins, max_staff, max_clients,
    created_by_auth_id, created_by
  ) VALUES (
    v_firm_id, trim(p_firm_name), trim(p_firm_name), v_workspace_code,
    nullif(upper(trim(coalesce(p_gstin, ''))), ''), 'Active',
    'Starter', 'Trial', v_trial_start, v_trial_end,
    p_max_admins, p_max_staff, p_max_clients, v_auth_id, v_auth_id
  );

  INSERT INTO public.users (
    id, auth_id, firm_id, name, email, role, status,
    is_workspace_owner, created_by, updated_by
  ) VALUES (
    v_user_id, v_auth_id, v_firm_id, trim(p_full_name), lower(trim(p_email)),
    'SuperAdmin', 'Active', true, null, null
  );

  INSERT INTO public.subscriptions (
    firm_id, plan, status, amount, billing_cycle, trial_ends_at,
    starts_at, expires_at, start_date, end_date, next_billing_date,
    trial_end_date, client_limit, staff_limit, storage_limit_gb,
    auto_renew, features, created_by, updated_by
  ) VALUES (
    v_firm_id, 'Starter', 'Trial', 0, 'Monthly', v_trial_end,
    v_trial_start, v_trial_end, v_trial_start, v_trial_end, v_trial_end,
    v_trial_end, p_max_clients, p_max_staff, 10,
    false,
    jsonb_build_object('clients', true, 'documents', true, 'compliance', true,
      'notices', true, 'billing', true, 'audit_logs', true,
      'automation', false, 'api_access', false, 'white_label', false),
    v_user_id, v_user_id
  );

  INSERT INTO public.notifications (
    firm_id, audience_role, title, message, status, created_by
  ) VALUES
  (
    null, 'GodAdmin', 'New trial workspace created',
    trim(p_full_name) || ' started a 15-day CAATH trial for ' || trim(p_firm_name) ||
      ' (' || lower(trim(p_email)) || '). No registration approval is required.',
    'UNREAD', v_user_id
  ),
  (
    v_firm_id, 'SuperAdmin', 'Welcome to your 15-day CAATH trial',
    'Your workspace is active now. Explore CAATH for 15 days, then choose a plan from the Subscription page to continue.',
    'UNREAD', v_user_id
  );

  RETURN QUERY SELECT v_firm_id, v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_owner(
  text, text, text, text, text, text, text, timestamptz, timestamptz,
  integer, integer, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_workspace_owner(
  text, text, text, text, text, text, text, timestamptz, timestamptz,
  integer, integer, integer
) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_paid_subscription(
  p_firm_id uuid,
  p_plan text,
  p_billing_cycle text,
  p_amount numeric,
  p_gst_amount numeric,
  p_total_amount numeric,
  p_utr_number text DEFAULT null,
  p_request_id uuid DEFAULT null,
  p_payment_method text DEFAULT 'Manual'
)
RETURNS TABLE(
  subscription_id uuid,
  invoice_id uuid,
  invoice_number text,
  starts_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_profile_id uuid := public.current_user_profile_id();
  v_actor_auth_id uuid := auth.uid();
  v_actor_name text;
  v_subscription_id uuid;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_start timestamptz := now();
  v_end timestamptz;
  v_max_admins integer;
  v_max_staff integer;
  v_max_clients integer;
  v_storage_limit integer;
  v_features jsonb;
  v_request_provider text;
  v_gateway_status text;
  v_sequence integer;
  v_firm_status text;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'GodAdmin' OR v_actor_profile_id IS NULL OR v_actor_auth_id IS NULL THEN
    RAISE EXCEPTION 'Only God Admin can activate paid subscriptions.' USING ERRCODE = '42501';
  END IF;
  IF p_plan NOT IN ('Starter', 'Professional', 'Enterprise') THEN
    RAISE EXCEPTION 'Invalid subscription plan.' USING ERRCODE = '22023';
  END IF;
  IF p_billing_cycle NOT IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Annual') THEN
    RAISE EXCEPTION 'Invalid billing cycle.' USING ERRCODE = '22023';
  END IF;
  IF p_amount < 0 OR p_gst_amount < 0 OR p_total_amount < 0 OR p_total_amount <> p_amount + p_gst_amount THEN
    RAISE EXCEPTION 'Subscription amounts are invalid.' USING ERRCODE = '22023';
  END IF;

  SELECT f.status INTO v_firm_status FROM public.firms f WHERE f.id = p_firm_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace was not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_firm_status IN ('Suspended', 'Blocked') THEN
    RAISE EXCEPTION 'Reactivate the workspace before activating its subscription.' USING ERRCODE = '55000';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT sr.payment_provider, pgo.status
      INTO v_request_provider, v_gateway_status
    FROM public.subscription_requests sr
    LEFT JOIN public.payment_gateway_orders pgo ON pgo.id = sr.gateway_order_id
    WHERE sr.id = p_request_id
      AND sr.firm_id = p_firm_id
      AND sr.plan = p_plan
      AND sr.billing_cycle = p_billing_cycle
      AND sr.status = 'Pending Verification'
    FOR UPDATE OF sr;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pending subscription request was not found or no longer matches.' USING ERRCODE = 'P0002';
    END IF;
    IF v_request_provider = 'Cashfree' AND v_gateway_status IS DISTINCT FROM 'PAID' THEN
      RAISE EXCEPTION 'Cashfree has not verified this payment as paid.' USING ERRCODE = '55000';
    END IF;
  END IF;

  v_end := CASE
    WHEN p_billing_cycle = 'Monthly' THEN v_start + interval '1 month'
    WHEN p_billing_cycle = 'Quarterly' THEN v_start + interval '3 months'
    WHEN p_billing_cycle = 'Half-Yearly' THEN v_start + interval '6 months'
    ELSE v_start + interval '1 year'
  END;

  v_max_admins := CASE p_plan WHEN 'Starter' THEN 1 WHEN 'Professional' THEN 3 ELSE 10 END;
  v_max_staff := CASE p_plan WHEN 'Starter' THEN 3 WHEN 'Professional' THEN 10 ELSE -1 END;
  v_max_clients := CASE p_plan WHEN 'Starter' THEN 10 WHEN 'Professional' THEN 50 ELSE -1 END;
  v_storage_limit := CASE p_plan WHEN 'Starter' THEN 10 WHEN 'Professional' THEN 50 ELSE 200 END;
  v_features := jsonb_build_object(
    'clients', true,
    'documents', true,
    'workflow', true,
    'gst_intelligence', true,
    'compliance', true,
    'notices', true,
    'reports', p_plan <> 'Starter',
    'billing', true,
    'analytics', p_plan <> 'Starter'
  );

  SELECT s.id INTO v_subscription_id
  FROM public.subscriptions s
  WHERE s.firm_id = p_firm_id
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    INSERT INTO public.subscriptions (
      firm_id, plan, status, amount, billing_cycle, starts_at, expires_at,
      trial_ends_at, start_date, end_date, next_billing_date, trial_end_date,
      grace_period_end_date, features, client_limit, staff_limit, storage_limit_gb,
      auto_renew, payment_method, last_payment_date, last_payment_status,
      approved_by, approved_at, created_by, updated_by
    ) VALUES (
      p_firm_id, p_plan, 'Active', p_amount, p_billing_cycle, v_start, v_end,
      null, v_start, v_end, v_end, null,
      null, v_features, v_max_clients, v_max_staff, v_storage_limit,
      false, coalesce(nullif(trim(p_payment_method), ''), 'Manual'), now(), 'Success',
      v_actor_profile_id, now(), v_actor_profile_id, v_actor_profile_id
    )
    RETURNING id INTO v_subscription_id;
  ELSE
    UPDATE public.subscriptions SET
      plan = p_plan,
      status = 'Active',
      amount = p_amount,
      billing_cycle = p_billing_cycle,
      starts_at = v_start,
      expires_at = v_end,
      trial_ends_at = null,
      start_date = v_start,
      end_date = v_end,
      next_billing_date = v_end,
      trial_end_date = null,
      grace_period_end_date = null,
      features = v_features,
      client_limit = v_max_clients,
      staff_limit = v_max_staff,
      storage_limit_gb = v_storage_limit,
      auto_renew = false,
      payment_method = coalesce(nullif(trim(p_payment_method), ''), 'Manual'),
      last_payment_date = now(),
      last_payment_status = 'Success',
      approved_by = v_actor_profile_id,
      approved_at = now(),
      updated_by = v_actor_profile_id,
      updated_at = now()
    WHERE id = v_subscription_id;
  END IF;

  UPDATE public.firms SET
    status = 'Active',
    subscription_plan = p_plan,
    subscription_status = 'Active',
    subscription_start_date = v_start,
    subscription_expiry_date = v_end,
    max_admins = v_max_admins,
    max_staff = v_max_staff,
    max_clients = v_max_clients,
    updated_by = v_actor_auth_id,
    updated_at = now()
  WHERE id = p_firm_id;

  UPDATE public.users SET
    status = 'Active',
    updated_by = v_actor_profile_id,
    updated_at = now()
  WHERE firm_id = p_firm_id
    AND is_workspace_owner = true
    AND status IN ('Pending Approval', 'Inactive');

  IF p_request_id IS NOT NULL THEN
    UPDATE public.subscription_requests SET
      status = 'Approved',
      updated_by = v_actor_profile_id,
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('caath-subscription-invoice-' || extract(year from v_start)::text));
  SELECT coalesce(max((regexp_match(si.invoice_number, '([0-9]+)$'))[1]::integer), 0) + 1
    INTO v_sequence
  FROM public.subscription_invoices si
  WHERE si.invoice_number LIKE 'CAATH-SUB-' || extract(year from v_start)::integer || '-%';
  v_invoice_number := 'CAATH-SUB-' || extract(year from v_start)::integer || '-' || lpad(v_sequence::text, 6, '0');

  INSERT INTO public.subscription_invoices (
    id, invoice_number, firm_id, subscription_id, plan, billing_cycle,
    amount, gst_amount, total_amount, utr_number, invoice_date,
    subscription_start_date, subscription_end_date, pdf_url
  ) VALUES (
    v_invoice_id, v_invoice_number, p_firm_id, v_subscription_id, p_plan, p_billing_cycle,
    p_amount, p_gst_amount, p_total_amount, nullif(trim(coalesce(p_utr_number, '')), ''), now(),
    v_start, v_end, null
  );

  SELECT u.name INTO v_actor_name FROM public.users u WHERE u.id = v_actor_profile_id;

  INSERT INTO public.audit_logs (
    firm_id, user_id, user_name, user_role, action, entity_type,
    entity_id, details, severity, created_by, updated_by
  ) VALUES (
    p_firm_id, v_actor_profile_id, coalesce(v_actor_name, 'God Admin'), 'GodAdmin',
    CASE WHEN p_request_id IS NULL THEN 'Manual Subscription Activation' ELSE 'Subscription Request Approved' END,
    'Subscription', v_subscription_id,
    p_plan || ' ' || p_billing_cycle || ' subscription activated. Invoice ' || v_invoice_number || '.',
    'info', v_actor_profile_id, v_actor_profile_id
  );

  INSERT INTO public.notifications (firm_id, audience_role, title, message, status, created_by)
  VALUES (
    p_firm_id, 'SuperAdmin', 'Subscription activated',
    'Your ' || p_plan || ' subscription is active until ' || to_char(v_end AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY') || '.',
    'UNREAD', v_actor_profile_id
  );

  RETURN QUERY SELECT v_subscription_id, v_invoice_id, v_invoice_number, v_start, v_end;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_paid_subscription(
  uuid, text, text, numeric, numeric, numeric, text, uuid, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_paid_subscription(
  uuid, text, text, numeric, numeric, numeric, text, uuid, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_subscription_status(
  p_firm_id uuid DEFAULT public.current_user_firm_id()
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT f.subscription_status FROM public.firms f WHERE f.id = p_firm_id LIMIT 1),
    'Inactive'
  )
$$;

REVOKE ALL ON FUNCTION public.get_subscription_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_feature(
  p_feature text,
  p_firm_id uuid DEFAULT public.current_user_firm_id()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (
      lower(trim(public.get_subscription_status(p_firm_id))) = 'active'
      AND COALESCE(
        (SELECT f.subscription_expiry_date FROM public.firms f WHERE f.id = p_firm_id LIMIT 1),
        now() + interval '100 years'
      ) >= now()
    )
    OR (
      lower(trim(public.get_subscription_status(p_firm_id))) = 'trial'
      AND COALESCE(
        (SELECT f.subscription_expiry_date FROM public.firms f WHERE f.id = p_firm_id LIMIT 1),
        now() - interval '1 second'
      ) >= now()
    )
    OR lower(trim(p_feature)) = 'subscription'
$$;

CREATE OR REPLACE FUNCTION public.get_remaining_limits(
  p_firm_id uuid DEFAULT public.current_user_firm_id()
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH firm_limits AS (
    SELECT
      COALESCE(max_admins, 1) AS max_admins,
      COALESCE(max_staff, 3) AS max_staff,
      COALESCE(max_clients, 10) AS max_clients
    FROM public.firms
    WHERE id = p_firm_id
  ),
  usage AS (
    SELECT
      COUNT(*) FILTER (WHERE role IN ('SuperAdmin', 'Admin') AND status = 'Active')::integer AS admin_count,
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
      'remaining', CASE WHEN firm_limits.max_admins = -1 THEN -1 ELSE GREATEST(firm_limits.max_admins - usage.admin_count, 0) END
    ),
    'staff', jsonb_build_object(
      'limit', firm_limits.max_staff,
      'used', usage.staff_count,
      'remaining', CASE WHEN firm_limits.max_staff = -1 THEN -1 ELSE GREATEST(firm_limits.max_staff - usage.staff_count, 0) END
    ),
    'clients', jsonb_build_object(
      'limit', firm_limits.max_clients,
      'used', clients_usage.client_count,
      'remaining', CASE WHEN firm_limits.max_clients = -1 THEN -1 ELSE GREATEST(firm_limits.max_clients - clients_usage.client_count, 0) END
    )
  )
  FROM firm_limits, usage, clients_usage
$$;

REVOKE ALL ON FUNCTION public.can_access_feature(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_feature(text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_remaining_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_remaining_limits(uuid) TO authenticated;

WITH pending_firms AS (
  SELECT DISTINCT f.id
  FROM public.firms f
  JOIN public.users u ON u.firm_id = f.id AND u.is_workspace_owner = true
  JOIN public.subscriptions s ON s.firm_id = f.id
  WHERE f.status = 'Pending'
    AND u.status = 'Pending Approval'
    AND s.status = 'Pending Verification'
),
activated_firms AS (
  UPDATE public.firms f SET
    status = 'Active',
    subscription_status = 'Trial',
    subscription_start_date = now(),
    subscription_expiry_date = now() + interval '15 days',
    updated_at = now()
  FROM pending_firms p
  WHERE f.id = p.id
  RETURNING f.id
),
activated_users AS (
  UPDATE public.users u SET
    status = 'Active',
    updated_at = now()
  FROM activated_firms f
  WHERE u.firm_id = f.id
    AND u.is_workspace_owner = true
  RETURNING u.firm_id
)
UPDATE public.subscriptions s SET
  status = 'Trial',
  starts_at = now(),
  expires_at = now() + interval '15 days',
  trial_ends_at = now() + interval '15 days',
  start_date = now(),
  end_date = now() + interval '15 days',
  next_billing_date = now() + interval '15 days',
  trial_end_date = now() + interval '15 days',
  updated_at = now()
FROM activated_users u
WHERE s.firm_id = u.firm_id
  AND s.status = 'Pending Verification';

INSERT INTO public.notifications (firm_id, audience_role, title, message, status, created_by)
SELECT f.id, 'SuperAdmin', 'Your 15-day CAATH trial is active',
       'Registration approval is no longer required. Your workspace is ready to use now.',
       'UNREAD', u.id
FROM public.firms f
JOIN public.users u ON u.firm_id = f.id AND u.is_workspace_owner = true
WHERE f.subscription_status = 'Trial'
  AND f.subscription_start_date >= now() - interval '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.firm_id = f.id AND n.title = 'Your 15-day CAATH trial is active'
  );

COMMIT;
