CREATE TABLE IF NOT EXISTS public.platform_regulatory_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL CHECK (area IN ('GST', 'Direct Tax', 'Company Law', 'Financial Regulation', 'Professional Practice')),
  authority text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  source_url text NOT NULL CHECK (source_url ~* '^https://'),
  source_label text NOT NULL,
  published_on date,
  effective_on date,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by uuid NOT NULL REFERENCES public.users(id),
  verified_by uuid REFERENCES public.users(id),
  verified_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_regulatory_updates_status_date
  ON public.platform_regulatory_updates (status, published_on DESC, published_at DESC, created_at DESC);

ALTER TABLE public.platform_regulatory_updates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_regulatory_updates TO authenticated;

DROP POLICY IF EXISTS platform_regulatory_updates_godadmin_manage ON public.platform_regulatory_updates;
CREATE POLICY platform_regulatory_updates_godadmin_manage
ON public.platform_regulatory_updates
FOR ALL TO authenticated
USING (public.is_god_admin())
WITH CHECK (public.is_god_admin());

DROP POLICY IF EXISTS platform_regulatory_updates_superadmin_read_published ON public.platform_regulatory_updates;
CREATE POLICY platform_regulatory_updates_superadmin_read_published
ON public.platform_regulatory_updates
FOR SELECT TO authenticated
USING (status = 'PUBLISHED' AND public.current_user_role() = 'SuperAdmin');
