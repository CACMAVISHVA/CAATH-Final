BEGIN;

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
  v_trial_end timestamptz := now() + interval '15 days';
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
      THEN 'Your CAATH workspace has been approved. You can now sign in and begin your 15-day free trial. Choose a paid plan later from the Subscription module.'
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

COMMIT;
