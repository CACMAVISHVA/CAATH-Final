BEGIN;

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
  ADD COLUMN IF NOT EXISTS created_by_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.firms
SET firm_name = COALESCE(firm_name, name),
    workspace_code = COALESCE(workspace_code, upper(substr(regexp_replace(COALESCE(name, 'CAATH'), '[^A-Za-z0-9]+', '', 'g'), 1, 8)) || '-' || substr(id::text, 1, 5)),
    subscription_start_date = COALESCE(subscription_start_date, created_at),
    subscription_expiry_date = COALESCE(subscription_expiry_date, created_at + interval '14 days')
WHERE firm_name IS NULL
   OR workspace_code IS NULL
   OR subscription_start_date IS NULL
   OR subscription_expiry_date IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'firms_subscription_status_check'
  ) THEN
    ALTER TABLE public.firms
      ADD CONSTRAINT firms_subscription_status_check
      CHECK (subscription_status IN ('Trial', 'Active', 'Pending Payment', 'Expired', 'Suspended', 'Cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'firms_subscription_plan_check'
  ) THEN
    ALTER TABLE public.firms
      ADD CONSTRAINT firms_subscription_plan_check
      CHECK (subscription_plan IN ('Starter', 'Professional', 'Enterprise'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS firms_workspace_code_key ON public.firms(workspace_code);
CREATE INDEX IF NOT EXISTS idx_firms_subscription_status ON public.firms(subscription_status);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_workspace_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_workspace_owner ON public.users(firm_id, is_workspace_owner);

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firms_public_workspace_insert ON public.firms;
CREATE POLICY firms_public_workspace_insert
ON public.firms
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_auth_id = auth.uid()
  AND subscription_status IN ('Trial', 'Pending Payment')
);

DROP POLICY IF EXISTS firms_tenant_select ON public.firms;
CREATE POLICY firms_tenant_select
ON public.firms
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR id = public.current_user_firm_id()
  OR created_by_auth_id = auth.uid()
);

DROP POLICY IF EXISTS firms_owner_update ON public.firms;
CREATE POLICY firms_owner_update
ON public.firms
FOR UPDATE
TO authenticated
USING (
  public.is_god_admin()
  OR (
    id = public.current_user_firm_id()
    AND public.current_user_role() = 'SuperAdmin'
  )
)
WITH CHECK (
  public.is_god_admin()
  OR (
    id = public.current_user_firm_id()
    AND public.current_user_role() = 'SuperAdmin'
  )
);

DROP POLICY IF EXISTS users_self_workspace_owner_insert ON public.users;
CREATE POLICY users_self_workspace_owner_insert
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth_id = auth.uid()
  AND role = 'SuperAdmin'
  AND status = 'Active'
  AND is_workspace_owner = true
  AND firm_id IN (
    SELECT id FROM public.firms WHERE created_by_auth_id = auth.uid()
  )
  AND created_by IS NULL
  AND updated_by IS NULL
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
      (public.current_user_role() = 'SuperAdmin' AND role IN ('Admin', 'Staff', 'Client'))
      OR (public.current_user_role() = 'Admin' AND role IN ('Staff', 'Client'))
      OR (public.current_user_role() = 'Staff' AND role = 'Client')
    )
  )
);

DROP POLICY IF EXISTS users_workspace_role_update ON public.users;
CREATE POLICY users_workspace_role_update
ON public.users
FOR UPDATE
TO authenticated
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND public.current_user_role() IN ('SuperAdmin', 'Admin')
  )
)
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND role != 'GodAdmin'
    AND (
      public.current_user_role() = 'SuperAdmin'
      OR (
        public.current_user_role() = 'Admin'
        AND role IN ('Staff', 'Client')
        AND is_workspace_owner = false
      )
    )
  )
);

COMMIT;
