BEGIN;

DO $$
DECLARE
  v_target_id uuid;
  v_target_firm_id uuid;
  v_replacement_id uuid;
BEGIN
  SELECT id, firm_id INTO v_target_id, v_target_firm_id
  FROM public.users
  WHERE lower(email) = 'cacmavishva@gmail.com'
  FOR UPDATE;

  SELECT id INTO v_replacement_id
  FROM public.users
  WHERE lower(email) = 'aathithvishva@gmail.com'
  FOR UPDATE;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Confirmed God Admin profile was not found.';
  END IF;
  IF v_target_firm_id IS NULL THEN
    RAISE EXCEPTION 'The workspace to preserve was not found.';
  END IF;
  IF v_replacement_id IS NULL THEN
    RAISE EXCEPTION 'Workspace replacement owner was not found.';
  END IF;

  UPDATE public.users
  SET is_workspace_owner = false, updated_at = now()
  WHERE id = v_target_id;

  UPDATE public.users
  SET role = 'SuperAdmin', firm_id = v_target_firm_id,
      is_workspace_owner = true, status = 'Active', updated_at = now()
  WHERE id = v_replacement_id;

  DELETE FROM public.users
  WHERE email IN (
    'caath-test-godadmin-20260911@example.com',
    'caath-test-godadmin-20260911-2@example.com'
  );

  UPDATE public.users
  SET role = 'GodAdmin', firm_id = null, is_workspace_owner = false,
      status = 'Active', updated_at = now()
  WHERE id = v_target_id;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_single_god_admin
  ON public.users ((role))
  WHERE role = 'GodAdmin';

COMMIT;
