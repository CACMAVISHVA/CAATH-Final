BEGIN;

ALTER TABLE public.firms
  DROP CONSTRAINT IF EXISTS firms_subscription_status_check;

ALTER TABLE public.firms
  ADD CONSTRAINT firms_subscription_status_check
  CHECK (subscription_status IN ('Trial', 'Active', 'Pending Payment', 'Pending Subscription', 'Expired', 'Suspended', 'Cancelled'));

CREATE TABLE IF NOT EXISTS public.auth_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid UNIQUE REFERENCES public.firms(id) ON DELETE CASCADE,
  otp_enabled boolean NOT NULL DEFAULT true,
  otp_requirement_mode text NOT NULL DEFAULT 'admins' CHECK (otp_requirement_mode IN ('admins', 'staff', 'all')),
  otp_expiry_minutes integer NOT NULL DEFAULT 5 CHECK (otp_expiry_minutes BETWEEN 1 AND 30),
  otp_attempt_limit integer NOT NULL DEFAULT 5 CHECK (otp_attempt_limit BETWEEN 1 AND 10),
  otp_resend_limit integer NOT NULL DEFAULT 3 CHECK (otp_resend_limit BETWEEN 1 AND 10),
  otp_resend_window_minutes integer NOT NULL DEFAULT 10 CHECK (otp_resend_window_minutes BETWEEN 1 AND 60),
  otp_resend_cooldown_seconds integer NOT NULL DEFAULT 30 CHECK (otp_resend_cooldown_seconds BETWEEN 10 AND 300),
  failed_password_limit integer NOT NULL DEFAULT 5 CHECK (failed_password_limit BETWEEN 1 AND 20),
  lockout_minutes integer NOT NULL DEFAULT 15 CHECK (lockout_minutes BETWEEN 1 AND 1440),
  session_timeout_minutes integer NOT NULL DEFAULT 60 CHECK (session_timeout_minutes BETWEEN 5 AND 1440),
  remember_me_session_days integer NOT NULL DEFAULT 30 CHECK (remember_me_session_days BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('Success', 'Failure')),
  event_type text NOT NULL CHECK (event_type IN (
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
  )),
  otp_status text CHECK (otp_status IN ('Not Required', 'Pending', 'Verified', 'Failed', 'Expired')),
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

CREATE INDEX IF NOT EXISTS idx_login_activity_firm_created ON public.login_activity(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_user_created ON public.login_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON public.trusted_devices(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON public.auth_sessions(user_id, terminated_at);

ALTER TABLE public.auth_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS users_workspace_role_insert ON public.users;
CREATE POLICY users_workspace_role_insert
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND status = 'Active'
    AND is_workspace_owner = false
    AND (
      (public.current_user_role() = 'SuperAdmin' AND role IN ('SuperAdmin', 'Admin', 'Staff', 'Client'))
      OR (public.current_user_role() = 'Admin' AND role IN ('Staff', 'Client'))
      OR (public.current_user_role() = 'Staff' AND role = 'Client')
    )
  )
);

COMMIT;
