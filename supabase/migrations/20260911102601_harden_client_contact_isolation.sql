-- Restrict client-contact mappings so a client can only read its own link and
-- cannot attach itself to another client record inside the same firm.
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_contacts_scope ON public.client_contacts;
DROP POLICY IF EXISTS client_contacts_select_scope ON public.client_contacts;
DROP POLICY IF EXISTS client_contacts_insert_scope ON public.client_contacts;
DROP POLICY IF EXISTS client_contacts_update_scope ON public.client_contacts;
DROP POLICY IF EXISTS client_contacts_delete_scope ON public.client_contacts;

CREATE POLICY client_contacts_select_scope ON public.client_contacts FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND (
      public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
      OR user_id = public.current_user_profile_id()
    )
  )
);

CREATE POLICY client_contacts_insert_scope ON public.client_contacts FOR INSERT
TO authenticated
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

CREATE POLICY client_contacts_update_scope ON public.client_contacts FOR UPDATE
TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

CREATE POLICY client_contacts_delete_scope ON public.client_contacts FOR DELETE
TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);
