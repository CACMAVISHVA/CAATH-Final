BEGIN;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
UPDATE public.subscriptions
SET billing_cycle = 'Yearly'
WHERE billing_cycle = 'Annual';
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'));

ALTER TABLE public.subscription_requests DROP CONSTRAINT IF EXISTS subscription_requests_billing_cycle_check;
ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS screenshot_path text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now();
UPDATE public.subscription_requests
SET billing_cycle = 'Yearly'
WHERE billing_cycle = 'Annual';
ALTER TABLE public.subscription_requests
  ADD CONSTRAINT subscription_requests_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'));

ALTER TABLE public.subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_billing_cycle_check;
UPDATE public.subscription_invoices
SET billing_cycle = 'Yearly'
WHERE billing_cycle = 'Annual';
ALTER TABLE public.subscription_invoices
  ADD CONSTRAINT subscription_invoices_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'));

CREATE INDEX IF NOT EXISTS idx_subscription_requests_submitted_at
  ON public.subscription_requests(submitted_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('subscription-payment-proofs', 'subscription-payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS subscription_payment_proofs_read ON storage.objects;
CREATE POLICY subscription_payment_proofs_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subscription-payment-proofs'
  AND (
    public.is_god_admin()
    OR split_part(name, '/', 1)::uuid = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS subscription_payment_proofs_insert ON storage.objects;
CREATE POLICY subscription_payment_proofs_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subscription-payment-proofs'
  AND split_part(name, '/', 1)::uuid = public.current_user_firm_id()
  AND public.current_user_role() = 'SuperAdmin'
);

COMMIT;
