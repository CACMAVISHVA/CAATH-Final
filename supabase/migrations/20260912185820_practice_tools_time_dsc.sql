CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 1000),
  billable boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_entries_firm_date_idx ON public.time_entries (firm_id, work_date DESC);
CREATE INDEX IF NOT EXISTS time_entries_user_date_idx ON public.time_entries (user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS time_entries_client_idx ON public.time_entries (client_id) WHERE client_id IS NOT NULL;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_select_scoped" ON public.time_entries FOR SELECT TO authenticated
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND (
    public.current_user_role() IN ('SuperAdmin', 'Admin')
    OR user_id = public.current_user_profile_id()
  ))
);

CREATE POLICY "time_entries_insert_own" ON public.time_entries FOR INSERT TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND user_id = public.current_user_profile_id()
  AND created_by = public.current_user_profile_id()
);

CREATE POLICY "time_entries_update_scoped" ON public.time_entries FOR UPDATE TO authenticated
USING (
  firm_id = public.current_user_firm_id()
  AND (public.current_user_role() IN ('SuperAdmin', 'Admin') OR user_id = public.current_user_profile_id())
)
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND (public.current_user_role() IN ('SuperAdmin', 'Admin') OR user_id = public.current_user_profile_id())
);

CREATE POLICY "time_entries_delete_scoped" ON public.time_entries FOR DELETE TO authenticated
USING (
  firm_id = public.current_user_firm_id()
  AND (public.current_user_role() IN ('SuperAdmin', 'Admin') OR (user_id = public.current_user_profile_id() AND status = 'Draft'))
);

CREATE TABLE IF NOT EXISTS public.digital_signature_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  holder_name text NOT NULL CHECK (char_length(btrim(holder_name)) BETWEEN 2 AND 120),
  holder_pan text CHECK (holder_pan IS NULL OR holder_pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  certificate_provider text NOT NULL CHECK (char_length(btrim(certificate_provider)) BETWEEN 2 AND 120),
  certificate_serial text NOT NULL CHECK (char_length(btrim(certificate_serial)) BETWEEN 3 AND 200),
  valid_from date NOT NULL,
  valid_until date NOT NULL CHECK (valid_until >= valid_from),
  alert_days integer NOT NULL DEFAULT 30 CHECK (alert_days BETWEEN 1 AND 365),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, certificate_serial)
);

CREATE INDEX IF NOT EXISTS digital_signature_firm_expiry_idx ON public.digital_signature_certificates (firm_id, valid_until);
CREATE INDEX IF NOT EXISTS digital_signature_client_idx ON public.digital_signature_certificates (client_id) WHERE client_id IS NOT NULL;

ALTER TABLE public.digital_signature_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digital_signatures_select_scoped" ON public.digital_signature_certificates FOR SELECT TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id());

CREATE POLICY "digital_signatures_insert_managers" ON public.digital_signature_certificates FOR INSERT TO authenticated
WITH CHECK (
  firm_id = public.current_user_firm_id()
  AND public.current_user_role() IN ('SuperAdmin', 'Admin')
  AND created_by = public.current_user_profile_id()
);

CREATE POLICY "digital_signatures_update_managers" ON public.digital_signature_certificates FOR UPDATE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
WITH CHECK (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'));

CREATE POLICY "digital_signatures_delete_managers" ON public.digital_signature_certificates FOR DELETE TO authenticated
USING (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_signature_certificates TO authenticated;
