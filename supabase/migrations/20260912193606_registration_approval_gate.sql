BEGIN;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Pending Approval', 'Rejected'));

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
    nullif(trim(coalesce(p_gstin, '')), ''), 'Pending',
    'Starter', 'Pending Verification', null, null,
    p_max_admins, p_max_staff, p_max_clients, v_auth_id, v_auth_id
  );

  INSERT INTO public.subscriptions (
    firm_id, plan, status, amount, billing_cycle, trial_ends_at,
    starts_at, expires_at, start_date, end_date, next_billing_date,
    trial_end_date, client_limit, staff_limit, storage_limit_gb,
    auto_renew, features, created_by, updated_by
  ) VALUES (
    v_firm_id, 'Starter', 'Pending Verification', 0, 'Monthly', null,
    null, null, null, null, null, null, p_max_clients, p_max_staff, 10,
    false,
    jsonb_build_object('clients', true, 'documents', true, 'compliance', true,
      'notices', true, 'billing', true, 'audit_logs', true,
      'automation', false, 'api_access', false, 'white_label', false),
    null, null
  );

  INSERT INTO public.users (
    id, auth_id, firm_id, name, email, role, status,
    is_workspace_owner, created_by, updated_by
  ) VALUES (
    v_user_id, v_auth_id, v_firm_id, trim(p_full_name), lower(trim(p_email)),
    'SuperAdmin', 'Pending Approval', true, null, null
  );

  INSERT INTO public.notifications (
    firm_id, audience_role, title, message, status, created_by
  ) VALUES (
    null, 'GodAdmin', 'New workspace registration',
    trim(p_full_name) || ' registered ' || trim(p_firm_name) ||
      ' (' || lower(trim(p_email)) || '). Review and approve the workspace.',
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

CREATE OR REPLACE FUNCTION public.review_workspace_registration(
  p_firm_id uuid,
  p_decision text,
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := public.current_user_profile_id();
  v_owner_name text;
  v_firm_name text;
  v_trial_start timestamptz := now();
  v_trial_end timestamptz := now() + interval '7 days';
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'GodAdmin' THEN
    RAISE EXCEPTION 'Only God Admin can review workspace registrations.' USING ERRCODE = '42501';
  END IF;
  IF upper(trim(p_decision)) NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'Decision must be APPROVE or REJECT.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(f.firm_name, f.name) INTO v_firm_name
  FROM public.firms f WHERE f.id = p_firm_id AND f.status = 'Pending' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending workspace registration was not found.' USING ERRCODE = 'P0002';
  END IF;
  SELECT u.name INTO v_owner_name
  FROM public.users u WHERE u.firm_id = p_firm_id AND u.is_workspace_owner = true LIMIT 1;

  IF upper(trim(p_decision)) = 'APPROVE' THEN
    UPDATE public.firms SET status = 'Active', subscription_status = 'Trial',
      subscription_start_date = v_trial_start, subscription_expiry_date = v_trial_end,
      updated_by = v_actor_id, updated_at = now()
    WHERE id = p_firm_id;
    UPDATE public.users SET status = 'Active', updated_by = v_actor_id, updated_at = now()
    WHERE firm_id = p_firm_id AND is_workspace_owner = true;
    UPDATE public.subscriptions SET status = 'Trial', starts_at = v_trial_start,
      expires_at = v_trial_end, start_date = v_trial_start, end_date = v_trial_end,
      trial_ends_at = v_trial_end, trial_end_date = v_trial_end,
      approved_by = v_actor_id, approved_at = now(), updated_by = v_actor_id, updated_at = now()
    WHERE firm_id = p_firm_id AND status = 'Pending Verification';
  ELSE
    UPDATE public.firms SET status = 'Blocked', subscription_status = 'Rejected',
      updated_by = v_actor_id, updated_at = now() WHERE id = p_firm_id;
    UPDATE public.users SET status = 'Rejected', updated_by = v_actor_id, updated_at = now()
    WHERE firm_id = p_firm_id AND is_workspace_owner = true;
    UPDATE public.subscriptions SET status = 'Rejected', updated_by = v_actor_id, updated_at = now()
    WHERE firm_id = p_firm_id AND status = 'Pending Verification';
  END IF;

  INSERT INTO public.notifications (firm_id, audience_role, title, message, status, created_by)
  VALUES (p_firm_id, 'SuperAdmin',
    CASE WHEN upper(trim(p_decision)) = 'APPROVE' THEN 'Workspace approved' ELSE 'Workspace registration rejected' END,
    CASE WHEN upper(trim(p_decision)) = 'APPROVE'
      THEN 'Your CAATH workspace has been approved. You can now sign in and begin your 7-day trial.'
      ELSE 'Your CAATH workspace registration was not approved.' ||
        CASE WHEN nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN '' ELSE ' Reason: ' || trim(p_reason) END
    END,
    'UNREAD', v_actor_id);

  INSERT INTO public.audit_logs (
    firm_id, user_id, user_name, user_role, action, entity_type,
    entity_id, details, severity, created_by
  ) VALUES (
    p_firm_id, v_actor_id, 'God Admin', 'GodAdmin',
    CASE WHEN upper(trim(p_decision)) = 'APPROVE' THEN 'Workspace Registration Approved' ELSE 'Workspace Registration Rejected' END,
    'Firm', p_firm_id,
    coalesce(v_owner_name, 'Workspace owner') || ' / ' || coalesce(v_firm_name, 'Workspace') ||
      CASE WHEN nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN '' ELSE '. Reason: ' || trim(p_reason) END,
    CASE WHEN upper(trim(p_decision)) = 'APPROVE' THEN 'info' ELSE 'warning' END,
    v_actor_id);
END;
$$;

REVOKE ALL ON FUNCTION public.review_workspace_registration(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_workspace_registration(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS notifications_scope ON public.notifications;
CREATE POLICY notifications_scope ON public.notifications FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR recipient_user_id = public.current_user_profile_id()
  OR (
    (firm_id IS NULL OR firm_id = public.current_user_firm_id())
    AND (audience_role IS NULL OR audience_role = public.current_user_role())
  )
)
WITH CHECK (
  public.is_god_admin()
  OR (
    (firm_id IS NULL OR firm_id = public.current_user_firm_id())
    AND (audience_role IS NULL OR audience_role = public.current_user_role())
  )
);

COMMIT;
