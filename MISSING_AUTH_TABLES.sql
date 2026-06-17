-- CAATH missing enterprise authentication tables repair script.
-- Safe for Supabase SQL Editor. Idempotent and data-preserving.
-- Source migration: supabase/migrations/20260617_enterprise_auth_security_foundation.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS firm_name text,
  ADD COLUMN IF NOT EXISTS workspace_code text,
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'Starter',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'Trial',
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz,
  ADD COLUMN IF NOT EXISTS max_admins integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_staff integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_clients integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS created_by_auth_id uuid;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_workspace_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.firms
  DROP CONSTRAINT IF EXISTS firms_subscription_status_check;

ALTER TABLE public.firms
  ADD CONSTRAINT firms_subscription_status_check
  CHECK (subscription_status IN ('Trial', 'Active', 'Pending Payment', 'Pending Subscription', 'Expired', 'Suspended', 'Cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS firms_workspace_code_key
  ON public.firms(workspace_code);

CREATE INDEX IF NOT EXISTS idx_users_workspace_owner
  ON public.users(firm_id, is_workspace_owner);

CREATE TABLE IF NOT EXISTS public.auth_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid UNIQUE REFERENCES public.firms(id) ON DELETE CASCADE,
  otp_enabled boolean NOT NULL DEFAULT false,
  otp_requirement_mode text NOT NULL DEFAULT 'admins',
  otp_expiry_minutes integer NOT NULL DEFAULT 5,
  otp_attempt_limit integer NOT NULL DEFAULT 5,
  otp_resend_limit integer NOT NULL DEFAULT 3,
  otp_resend_window_minutes integer NOT NULL DEFAULT 10,
  otp_resend_cooldown_seconds integer NOT NULL DEFAULT 30,
  failed_password_limit integer NOT NULL DEFAULT 5,
  lockout_minutes integer NOT NULL DEFAULT 15,
  session_timeout_minutes integer NOT NULL DEFAULT 60,
  remember_me_session_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL,
  event_type text NOT NULL,
  otp_status text,
  device_fingerprint text,
  device_label text,
  ip_address inet,
  user_agent text,
  approximate_location text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_label text,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text,
  device_label text,
  user_agent text,
  remember_me boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  terminated_at timestamptz,
  termination_reason text
);

ALTER TABLE public.auth_security_settings
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS firm_id uuid,
  ADD COLUMN IF NOT EXISTS otp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_requirement_mode text NOT NULL DEFAULT 'admins',
  ADD COLUMN IF NOT EXISTS otp_expiry_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS otp_attempt_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS otp_resend_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS otp_resend_window_minutes integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS otp_resend_cooldown_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS failed_password_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS lockout_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS session_timeout_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS remember_me_session_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.login_activity
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS firm_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS auth_id uuid,
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Failure',
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'password_login',
  ADD COLUMN IF NOT EXISTS otp_status text,
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS device_label text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS approximate_location text,
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS logout_at timestamptz;

ALTER TABLE public.trusted_devices
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS firm_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS auth_id uuid,
  ADD COLUMN IF NOT EXISTS device_fingerprint text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_label text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS firm_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS auth_id uuid,
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS device_label text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS remember_me boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS termination_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_otp_requirement_mode_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_otp_requirement_mode_check
      CHECK (otp_requirement_mode IN ('admins', 'staff', 'all')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_otp_expiry_minutes_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_otp_expiry_minutes_check
      CHECK (otp_expiry_minutes BETWEEN 1 AND 30) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_otp_attempt_limit_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_otp_attempt_limit_check
      CHECK (otp_attempt_limit BETWEEN 1 AND 10) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_otp_resend_limit_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_otp_resend_limit_check
      CHECK (otp_resend_limit BETWEEN 1 AND 10) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_otp_resend_window_minutes_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_otp_resend_window_minutes_check
      CHECK (otp_resend_window_minutes BETWEEN 1 AND 60) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_otp_resend_cooldown_seconds_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_otp_resend_cooldown_seconds_check
      CHECK (otp_resend_cooldown_seconds BETWEEN 10 AND 300) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_failed_password_limit_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_failed_password_limit_check
      CHECK (failed_password_limit BETWEEN 1 AND 20) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_lockout_minutes_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_lockout_minutes_check
      CHECK (lockout_minutes BETWEEN 1 AND 1440) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_session_timeout_minutes_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_session_timeout_minutes_check
      CHECK (session_timeout_minutes BETWEEN 5 AND 1440) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_remember_me_session_days_check'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_remember_me_session_days_check
      CHECK (remember_me_session_days BETWEEN 1 AND 120) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_activity_status_check'
      AND conrelid = 'public.login_activity'::regclass
  ) THEN
    ALTER TABLE public.login_activity
      ADD CONSTRAINT login_activity_status_check
      CHECK (status IN ('Success', 'Failure')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_activity_event_type_check'
      AND conrelid = 'public.login_activity'::regclass
  ) THEN
    ALTER TABLE public.login_activity
      ADD CONSTRAINT login_activity_event_type_check
      CHECK (event_type IN (
        'password_login',
        'otp_generated',
        'otp_sent',
        'otp_verified',
        'otp_failed',
        'otp_expired',
        'otp_resent',
        'password_reset',
        'logout',
        'new_device',
        'user_provisioned'
      )) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_activity_otp_status_check'
      AND conrelid = 'public.login_activity'::regclass
  ) THEN
    ALTER TABLE public.login_activity
      ADD CONSTRAINT login_activity_otp_status_check
      CHECK (otp_status IN ('Not Required', 'Pending', 'Verified', 'Failed', 'Expired')) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS auth_security_settings_firm_id_key
  ON public.auth_security_settings(firm_id);
CREATE UNIQUE INDEX IF NOT EXISTS trusted_devices_user_device_key
  ON public.trusted_devices(user_id, device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_login_activity_firm_created
  ON public.login_activity(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_user_created
  ON public.login_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user
  ON public.trusted_devices(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
  ON public.auth_sessions(user_id, terminated_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_security_settings_firm_id_fkey'
      AND conrelid = 'public.auth_security_settings'::regclass
  ) THEN
    ALTER TABLE public.auth_security_settings
      ADD CONSTRAINT auth_security_settings_firm_id_fkey
      FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_activity_firm_id_fkey'
      AND conrelid = 'public.login_activity'::regclass
  ) THEN
    ALTER TABLE public.login_activity
      ADD CONSTRAINT login_activity_firm_id_fkey
      FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_activity_user_id_fkey'
      AND conrelid = 'public.login_activity'::regclass
  ) THEN
    ALTER TABLE public.login_activity
      ADD CONSTRAINT login_activity_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_activity_auth_id_fkey'
      AND conrelid = 'public.login_activity'::regclass
  ) THEN
    ALTER TABLE public.login_activity
      ADD CONSTRAINT login_activity_auth_id_fkey
      FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trusted_devices_firm_id_fkey'
      AND conrelid = 'public.trusted_devices'::regclass
  ) THEN
    ALTER TABLE public.trusted_devices
      ADD CONSTRAINT trusted_devices_firm_id_fkey
      FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trusted_devices_user_id_fkey'
      AND conrelid = 'public.trusted_devices'::regclass
  ) THEN
    ALTER TABLE public.trusted_devices
      ADD CONSTRAINT trusted_devices_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trusted_devices_auth_id_fkey'
      AND conrelid = 'public.trusted_devices'::regclass
  ) THEN
    ALTER TABLE public.trusted_devices
      ADD CONSTRAINT trusted_devices_auth_id_fkey
      FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_sessions_firm_id_fkey'
      AND conrelid = 'public.auth_sessions'::regclass
  ) THEN
    ALTER TABLE public.auth_sessions
      ADD CONSTRAINT auth_sessions_firm_id_fkey
      FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_sessions_user_id_fkey'
      AND conrelid = 'public.auth_sessions'::regclass
  ) THEN
    ALTER TABLE public.auth_sessions
      ADD CONSTRAINT auth_sessions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_sessions_auth_id_fkey'
      AND conrelid = 'public.auth_sessions'::regclass
  ) THEN
    ALTER TABLE public.auth_sessions
      ADD CONSTRAINT auth_sessions_auth_id_fkey
      FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

ALTER TABLE public.auth_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_security_settings TO authenticated;
GRANT SELECT, INSERT ON public.login_activity TO anon, authenticated;
GRANT UPDATE, DELETE ON public.login_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_sessions TO authenticated;

DROP POLICY IF EXISTS auth_security_settings_superadmin ON public.auth_security_settings;
CREATE POLICY auth_security_settings_superadmin
ON public.auth_security_settings
FOR ALL
TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
);

DROP POLICY IF EXISTS login_activity_insert_authenticated ON public.login_activity;
CREATE POLICY login_activity_insert_authenticated
ON public.login_activity
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.is_god_admin()
  OR firm_id IS NULL
  OR firm_id = public.current_user_firm_id()
  OR auth_id = auth.uid()
);

DROP POLICY IF EXISTS login_activity_select_scope ON public.login_activity;
CREATE POLICY login_activity_select_scope
ON public.login_activity
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
  OR user_id = public.current_user_profile_id()
);

DROP POLICY IF EXISTS trusted_devices_user_scope ON public.trusted_devices;
CREATE POLICY trusted_devices_user_scope
ON public.trusted_devices
FOR ALL
TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
  OR user_id = public.current_user_profile_id()
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
  OR user_id = public.current_user_profile_id()
);

DROP POLICY IF EXISTS auth_sessions_user_scope ON public.auth_sessions;
CREATE POLICY auth_sessions_user_scope
ON public.auth_sessions
FOR ALL
TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
  OR user_id = public.current_user_profile_id()
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
  OR user_id = public.current_user_profile_id()
);

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
