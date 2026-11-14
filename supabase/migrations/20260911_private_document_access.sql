BEGIN;

UPDATE public.document_vault
SET file_path = regexp_replace(file_path, '^.*/storage/v1/object/public/documents/', '')
WHERE file_path LIKE 'http%/storage/v1/object/public/documents/%';

UPDATE storage.buckets SET public = false WHERE id IN ('documents', 'client-documents');

DROP POLICY IF EXISTS document_vault_tenant_scope ON public.document_vault;
DROP POLICY IF EXISTS document_vault_internal_access ON public.document_vault;
DROP POLICY IF EXISTS document_vault_client_read ON public.document_vault;
DROP POLICY IF EXISTS document_vault_client_insert ON public.document_vault;

CREATE POLICY document_vault_internal_access ON public.document_vault
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
);

CREATE POLICY document_vault_client_read ON public.document_vault
FOR SELECT TO authenticated
USING (
  firm_id = public.current_user_firm_id()
  AND public.current_user_role() = 'Client'
  AND EXISTS (
    SELECT 1 FROM public.client_contacts cc
    WHERE cc.client_id = document_vault.client_id
      AND cc.user_id = public.current_user_profile_id()
      AND cc.firm_id = public.current_user_firm_id()
  )
);

CREATE POLICY document_vault_client_insert ON public.document_vault
FOR INSERT TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND public.current_user_role() = 'Client'
  AND uploaded_by = public.current_user_profile_id()
  AND EXISTS (
    SELECT 1 FROM public.client_contacts cc
    WHERE cc.client_id = document_vault.client_id
      AND cc.user_id = public.current_user_profile_id()
      AND cc.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS documents_tenant_read ON storage.objects;
DROP POLICY IF EXISTS documents_tenant_insert ON storage.objects;
DROP POLICY IF EXISTS documents_tenant_update ON storage.objects;
DROP POLICY IF EXISTS documents_tenant_delete ON storage.objects;

CREATE POLICY documents_tenant_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.is_god_admin()
    OR (
      split_part(name, '/', 1) = public.current_user_firm_id()::text
      AND (
        public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
        OR (
          public.current_user_role() = 'Client'
          AND EXISTS (
            SELECT 1 FROM public.client_contacts cc
            WHERE cc.user_id = public.current_user_profile_id()
              AND cc.firm_id = public.current_user_firm_id()
              AND cc.client_id::text = split_part(name, '/', 2)
          )
        )
      )
    )
  )
);

CREATE POLICY documents_tenant_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND split_part(name, '/', 1) = public.current_user_firm_id()::text
  AND (
    public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
    OR (
      public.current_user_role() = 'Client'
      AND EXISTS (
        SELECT 1 FROM public.client_contacts cc
        WHERE cc.user_id = public.current_user_profile_id()
          AND cc.firm_id = public.current_user_firm_id()
          AND cc.client_id::text = split_part(name, '/', 2)
      )
    )
  )
);

CREATE POLICY documents_tenant_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND split_part(name, '/', 1) = public.current_user_firm_id()::text
  AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
)
WITH CHECK (
  bucket_id = 'documents'
  AND split_part(name, '/', 1) = public.current_user_firm_id()::text
  AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
);

CREATE POLICY documents_tenant_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.is_god_admin()
    OR (split_part(name, '/', 1) = public.current_user_firm_id()::text AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
  )
);

COMMIT;
