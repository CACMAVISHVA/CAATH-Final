BEGIN;

CREATE TABLE IF NOT EXISTS public.gst_filing_workpapers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  return_type text NOT NULL CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-9', 'CMP-08')),
  filing_frequency text NOT NULL CHECK (filing_frequency IN ('Monthly', 'Quarterly', 'Annual', 'Composition')),
  tax_period text NOT NULL CHECK (char_length(btrim(tax_period)) BETWEEN 3 AND 30),
  due_date date,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Validated', 'Ready to File', 'Filed')),
  source_mode text NOT NULL DEFAULT 'Upload' CHECK (source_mode IN ('Upload', 'Books', 'Reconciliation')),
  validation_errors integer NOT NULL DEFAULT 0 CHECK (validation_errors >= 0),
  arn text,
  notes text,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, client_id, return_type, tax_period)
);

CREATE TABLE IF NOT EXISTS public.gst_challan_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  tax_period text NOT NULL CHECK (char_length(btrim(tax_period)) BETWEEN 3 AND 30),
  purpose text NOT NULL CHECK (char_length(btrim(purpose)) BETWEEN 3 AND 120),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Generated', 'Paid', 'Expired')),
  challan_number text,
  payment_reference text,
  paid_at timestamptz,
  notes text,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_litigation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  case_number text NOT NULL CHECK (char_length(btrim(case_number)) BETWEEN 3 AND 80),
  forum text NOT NULL CHECK (forum IN ('GST Authority', 'Appellate Authority', 'Tribunal', 'High Court', 'Supreme Court')),
  stage text NOT NULL DEFAULT 'Notice received' CHECK (stage IN ('Notice received', 'Reply preparation', 'Reply filed', 'Hearing', 'Order received', 'Appeal', 'Closed')),
  hearing_date timestamptz,
  response_due_date date,
  amount_disputed numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_disputed >= 0),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'On hold', 'Closed')),
  owner_name text,
  notes text,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, case_number)
);

CREATE INDEX IF NOT EXISTS idx_gst_filing_workpapers_firm_due ON public.gst_filing_workpapers(firm_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_gst_challan_register_firm_due ON public.gst_challan_register(firm_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_gst_litigation_cases_firm_hearing ON public.gst_litigation_cases(firm_id, hearing_date, status);

ALTER TABLE public.gst_filing_workpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_challan_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_litigation_cases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.gst_filing_workpapers, public.gst_challan_register, public.gst_litigation_cases FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.gst_filing_workpapers, public.gst_challan_register, public.gst_litigation_cases TO authenticated;
GRANT UPDATE (status, updated_at) ON public.gst_filing_workpapers TO authenticated;
GRANT UPDATE (status, updated_at, paid_at) ON public.gst_challan_register TO authenticated;
GRANT UPDATE (status, updated_at) ON public.gst_litigation_cases TO authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['gst_filing_workpapers', 'gst_challan_register', 'gst_litigation_cases'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_read', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (firm_id = public.current_user_firm_id())', table_name || '_read', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_create', table_name);
    EXECUTE format($policy$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
      firm_id = public.current_user_firm_id()
      AND created_by = public.current_user_profile_id()
      AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
      AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id())
    )$policy$, table_name || '_create', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (firm_id = public.current_user_firm_id() AND public.current_user_role() IN (''SuperAdmin'', ''Admin'', ''Staff'')) WITH CHECK (firm_id = public.current_user_firm_id() AND public.current_user_role() IN (''SuperAdmin'', ''Admin'', ''Staff''))', table_name || '_update', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (firm_id = public.current_user_firm_id() AND public.current_user_role() IN (''SuperAdmin'', ''Admin''))', table_name || '_delete', table_name);
  END LOOP;
END $$;

COMMIT;
