CREATE TABLE IF NOT EXISTS public.firm_branding (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  logo_path text,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (logo_path IS NULL OR (char_length(logo_path) BETWEEN 3 AND 500 AND logo_path !~ '\.\.'))
);

ALTER TABLE public.firm_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_branding_select_scoped" ON public.firm_branding FOR SELECT TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id());

CREATE POLICY "firm_branding_insert_owner" ON public.firm_branding FOR INSERT TO authenticated
WITH CHECK (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin');

CREATE POLICY "firm_branding_update_owner" ON public.firm_branding FOR UPDATE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
WITH CHECK (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin');

CREATE POLICY "firm_branding_delete_owner" ON public.firm_branding FOR DELETE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_branding TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('firm-branding', 'firm-branding', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 2097152, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "firm_branding_files_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'firm-branding'
  AND (storage.foldername(name))[1] = public.current_user_firm_id()::text
);

CREATE POLICY "firm_branding_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'firm-branding'
  AND (storage.foldername(name))[1] = public.current_user_firm_id()::text
  AND public.current_user_role() = 'SuperAdmin'
);

CREATE POLICY "firm_branding_files_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'firm-branding'
  AND (storage.foldername(name))[1] = public.current_user_firm_id()::text
  AND public.current_user_role() = 'SuperAdmin'
)
WITH CHECK (
  bucket_id = 'firm-branding'
  AND (storage.foldername(name))[1] = public.current_user_firm_id()::text
  AND public.current_user_role() = 'SuperAdmin'
);

CREATE POLICY "firm_branding_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'firm-branding'
  AND (storage.foldername(name))[1] = public.current_user_firm_id()::text
  AND public.current_user_role() = 'SuperAdmin'
);
