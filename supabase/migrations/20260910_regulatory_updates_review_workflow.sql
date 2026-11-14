CREATE TABLE IF NOT EXISTS public.regulatory_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
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
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_updates_firm_status_date
  ON public.regulatory_updates (firm_id, status, published_on DESC, created_at DESC);

ALTER TABLE public.regulatory_updates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regulatory_updates TO authenticated;

DROP POLICY IF EXISTS regulatory_updates_superadmin_only ON public.regulatory_updates;
CREATE POLICY regulatory_updates_superadmin_only
ON public.regulatory_updates
FOR ALL TO authenticated
USING (
  firm_id = public.current_user_firm_id()
  AND public.current_user_role() = 'SuperAdmin'
)
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND public.current_user_role() = 'SuperAdmin'
  AND created_by = public.current_user_profile_id()
);
