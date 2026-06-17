BEGIN;

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
    RAISE EXCEPTION 'Workspace bootstrap requires an authenticated Supabase session.'
      USING ERRCODE = '28000';
  END IF;

  SELECT email INTO v_auth_email
  FROM auth.users
  WHERE id = v_auth_id;

  IF v_auth_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated Supabase user % was not found.', v_auth_id
      USING ERRCODE = '23503';
  END IF;

  IF lower(trim(v_auth_email)) <> lower(trim(p_email)) THEN
    RAISE EXCEPTION 'Workspace bootstrap email mismatch for authenticated user %. Auth email %, requested email %.',
      v_auth_id, v_auth_email, p_email
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = v_auth_id) THEN
    RAISE EXCEPTION 'A CAATH profile already exists for authenticated user %.', v_auth_id
      USING ERRCODE = '23505';
  END IF;

  v_workspace_base := upper(substr(regexp_replace(coalesce(nullif(trim(p_firm_name), ''), 'CAATH'), '[^A-Za-z0-9]+', '', 'g'), 1, 8));
  IF v_workspace_base = '' THEN
    v_workspace_base := 'CAATH';
  END IF;
  v_workspace_code := v_workspace_base || '-' || substr(v_firm_id::text, 1, 5);

  RAISE LOG '[AUTH] create_workspace_owner inserting auth_id=%, email=%, role=SuperAdmin, status=Active, firm_id=%',
    v_auth_id, p_email, v_firm_id;

  INSERT INTO public.firms (
    id,
    name,
    firm_name,
    workspace_code,
    gstin,
    subscription_plan,
    subscription_status,
    subscription_start_date,
    subscription_expiry_date,
    max_admins,
    max_staff,
    max_clients,
    created_by_auth_id,
    created_by
  ) VALUES (
    v_firm_id,
    trim(p_firm_name),
    trim(p_firm_name),
    v_workspace_code,
    nullif(trim(coalesce(p_gstin, '')), ''),
    p_subscription_plan,
    p_subscription_status,
    p_subscription_start_date,
    p_subscription_expiry_date,
    p_max_admins,
    p_max_staff,
    p_max_clients,
    v_auth_id,
    v_auth_id
  );

  INSERT INTO public.users (
    id,
    auth_id,
    firm_id,
    name,
    email,
    role,
    status,
    is_workspace_owner,
    created_by,
    updated_by
  ) VALUES (
    v_user_id,
    v_auth_id,
    v_firm_id,
    trim(p_full_name),
    trim(p_email),
    'SuperAdmin',
    'Active',
    true,
    null,
    null
  );

  RETURN QUERY SELECT v_firm_id, v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_owner(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_workspace_owner(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  integer
) TO authenticated;

COMMIT;
