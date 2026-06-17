BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'Starter',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'Trial',
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz,
  ADD COLUMN IF NOT EXISTS max_admins integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_staff integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_clients integer NOT NULL DEFAULT 10;

ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_subscription_status_check;
ALTER TABLE public.firms
  ADD CONSTRAINT firms_subscription_status_check
  CHECK (subscription_status IN ('Trial', 'Pending Verification', 'Pending Payment', 'Active', 'Expired', 'Suspended', 'Cancelled', 'Rejected'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS client_limit integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS staff_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS storage_limit_gb integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_status text;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
UPDATE public.subscriptions
SET status = 'Pending Verification'
WHERE status = 'Pending';
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('Trial', 'Pending Verification', 'Pending Payment', 'Active', 'Expired', 'Suspended', 'Cancelled', 'Rejected'));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
UPDATE public.subscriptions
SET billing_cycle = 'Annual'
WHERE billing_cycle = 'Yearly';
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Annual'));

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('Starter', 'Professional', 'Enterprise')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('Monthly', 'Annual')),
  amount numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  utr_number text NOT NULL,
  status text NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Pending Verification', 'Approved', 'Rejected')),
  remarks text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan text NOT NULL CHECK (plan IN ('Starter', 'Professional', 'Enterprise')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('Monthly', 'Annual')),
  amount numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  utr_number text,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  subscription_start_date timestamptz NOT NULL,
  subscription_end_date timestamptz NOT NULL,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  company_name text NOT NULL DEFAULT 'CAATH PMS',
  company_address text,
  company_gstin text,
  subscription_upi_id text,
  subscription_qr_image_url text,
  subscription_contact_email text,
  subscription_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, company_name)
VALUES (true, 'CAATH PMS')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_subscription_requests_firm_created ON public.subscription_requests(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON public.subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_firm_created ON public.subscription_invoices(firm_id, created_at DESC);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.subscription_requests TO authenticated;
GRANT SELECT, INSERT ON public.subscription_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;

DROP POLICY IF EXISTS subscription_requests_scope ON public.subscription_requests;
CREATE POLICY subscription_requests_scope
ON public.subscription_requests
FOR ALL
TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS subscription_invoices_scope ON public.subscription_invoices;
CREATE POLICY subscription_invoices_scope
ON public.subscription_invoices
FOR ALL
TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS platform_settings_godadmin_manage ON public.platform_settings;
CREATE POLICY platform_settings_godadmin_manage
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.is_god_admin() OR public.current_user_role() = 'SuperAdmin')
WITH CHECK (public.is_god_admin());

COMMIT;
