BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_client_insert ON public.users;
CREATE POLICY users_self_client_insert
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth_id = auth.uid()
  AND role = 'Client'
  AND status = 'Active'
  AND firm_id IS NOT NULL
  AND created_by IS NULL
  AND updated_by IS NULL
);

COMMIT;
