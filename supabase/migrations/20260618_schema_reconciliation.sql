BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add columns expected by subscription and billing services without rewriting existing rows.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS client_limit integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS staff_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS storage_limit_gb integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_status text;

UPDATE public.subscriptions
SET start_date = COALESCE(start_date, starts_at, created_at),
    end_date = COALESCE(end_date, expires_at, trial_ends_at, created_at + interval '14 days'),
    next_billing_date = COALESCE(next_billing_date, expires_at, trial_ends_at, created_at + interval '14 days'),
    trial_end_date = COALESCE(trial_end_date, trial_ends_at),
    auto_renew = COALESCE(auto_renew, false)
WHERE start_date IS NULL
   OR end_date IS NULL
   OR next_billing_date IS NULL
   OR trial_end_date IS NULL;

CREATE TABLE IF NOT EXISTS public.document_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  category text NOT NULL,
  document_type text NOT NULL DEFAULT 'Other',
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_compliance_id uuid REFERENCES public.compliance_tasks(id) ON DELETE SET NULL,
  linked_invoice_id uuid,
  linked_notice_id uuid REFERENCES public.notices(id) ON DELETE SET NULL,
  linked_approval_id uuid REFERENCES public.approval_tasks(id) ON DELETE SET NULL,
  parent_document_id uuid REFERENCES public.document_vault(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_by_name text NOT NULL DEFAULT 'Unknown',
  ocr_status text CHECK (ocr_status IN ('PENDING', 'READY', 'FAILED')),
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.document_vault (
  id, firm_id, client_id, category, document_type, name, file_path, version,
  is_archived, is_deleted, uploaded_by, uploaded_by_name, created_at, updated_at
)
SELECT d.id, d.firm_id, d.client_id, d.category, d.category, d.name, d.storage_path,
       d.version, d.workflow_stage = 'ARCHIVED', false, d.uploaded_by,
       COALESCE(u.name, 'Unknown'), d.created_at, d.updated_at
FROM public.documents d
LEFT JOIN public.users u ON u.id = d.uploaded_by
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  document_id uuid REFERENCES public.document_vault(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  financial_year text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT current_date,
  place_of_supply text NOT NULL DEFAULT 'Within State',
  gst_treatment text NOT NULL DEFAULT 'Registered',
  billing_category text NOT NULL DEFAULT 'Professional Services',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  cgst_amount numeric NOT NULL DEFAULT 0,
  sgst_amount numeric NOT NULL DEFAULT 0,
  igst_amount numeric NOT NULL DEFAULT 0,
  total_gst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Generated', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
  notes text,
  terms text,
  line_items jsonb NOT NULL DEFAULT '[]',
  paid_amount numeric NOT NULL DEFAULT 0,
  pending_amount numeric NOT NULL DEFAULT 0,
  paid_date timestamptz,
  sent_date timestamptz,
  viewed_date timestamptz,
  cancelled_date timestamptz,
  cancelled_reason text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, invoice_number)
);

INSERT INTO public.invoices (
  firm_id, client_id, invoice_number, issue_date, due_date, total, pending_amount,
  status, billing_category, created_by, updated_by, created_at, updated_at
)
SELECT b.firm_id, b.client_id, b.invoice_number, b.date, COALESCE(b.due_date, b.date),
       b.amount, CASE WHEN b.status = 'Paid' THEN 0 ELSE b.amount END,
       CASE WHEN b.status = 'Paid' THEN 'Paid' WHEN b.status = 'Unpaid' THEN 'Sent' ELSE 'Draft' END,
       COALESCE(b.type, 'Professional Services'), b.created_by, b.updated_by, b.created_at, b.updated_at
FROM public.billing b
ON CONFLICT (firm_id, invoice_number) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_vault_linked_invoice_fk'
  ) THEN
    ALTER TABLE public.document_vault
      ADD CONSTRAINT document_vault_linked_invoice_fk
      FOREIGN KEY (linked_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_mode text NOT NULL CHECK (payment_mode IN ('Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Card', 'Other')),
  reference text,
  received_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  vendor text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT current_date,
  payment_date timestamptz,
  payment_mode text CHECK (payment_mode IN ('Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Card')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid')),
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  receipt_document_id uuid REFERENCES public.document_vault(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT 'Support request',
  description text,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gstr1_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period)
);

CREATE TABLE IF NOT EXISTS public.gstr3b_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period)
);

CREATE TABLE IF NOT EXISTS public.purchase_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_no text NOT NULL,
  invoice_date date NOT NULL,
  supplier_gstin text,
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  original_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.filings
WITH (security_invoker = true) AS
SELECT id, firm_id, client_id, return_type, period, due_date, filing_date, status,
       taxable_value, tax_collected, tax_claimed, created_at
FROM public.gstr_filings;

CREATE INDEX IF NOT EXISTS idx_document_vault_firm_created ON public.document_vault(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_vault_client_active ON public.document_vault(client_id, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_vault_links ON public.document_vault(linked_task_id, linked_notice_id, linked_invoice_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_document ON public.document_audit_logs(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_firm ON public.document_audit_logs(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_firm_created ON public.invoices(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_due ON public.invoices(client_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_firm_date ON public.expenses(firm_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_firm_status ON public.support_tickets(firm_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gstr1_data_client_period ON public.gstr1_data(client_id, period);
CREATE INDEX IF NOT EXISTS idx_gstr3b_data_client_period ON public.gstr3b_data(client_id, period);
CREATE INDEX IF NOT EXISTS idx_purchase_register_client_date ON public.purchase_register(client_id, invoice_date DESC);

ALTER TABLE public.document_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gstr1_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gstr3b_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_vault_tenant_scope ON public.document_vault;
CREATE POLICY document_vault_tenant_scope ON public.document_vault
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS document_audit_logs_tenant_scope ON public.document_audit_logs;
CREATE POLICY document_audit_logs_tenant_scope ON public.document_audit_logs
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS invoices_tenant_scope ON public.invoices;
CREATE POLICY invoices_tenant_scope ON public.invoices
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS invoice_payments_tenant_scope ON public.invoice_payments;
CREATE POLICY invoice_payments_tenant_scope ON public.invoice_payments
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS expenses_tenant_scope ON public.expenses;
CREATE POLICY expenses_tenant_scope ON public.expenses
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS support_tickets_tenant_scope ON public.support_tickets;
CREATE POLICY support_tickets_tenant_scope ON public.support_tickets
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id() OR created_by = public.current_user_profile_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id() OR created_by = public.current_user_profile_id());

DROP POLICY IF EXISTS gstr1_data_tenant_scope ON public.gstr1_data;
CREATE POLICY gstr1_data_tenant_scope ON public.gstr1_data
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS gstr3b_data_tenant_scope ON public.gstr3b_data;
CREATE POLICY gstr3b_data_tenant_scope ON public.gstr3b_data
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS purchase_register_tenant_scope ON public.purchase_register;
CREATE POLICY purchase_register_tenant_scope ON public.purchase_register
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
