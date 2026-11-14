BEGIN;

ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_subscription_requests_submitted_at
  ON public.subscription_requests(submitted_at DESC);

ALTER TABLE public.subscription_invoices
  DROP CONSTRAINT IF EXISTS subscription_invoices_billing_cycle_check;
ALTER TABLE public.subscription_invoices
  ADD CONSTRAINT subscription_invoices_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Annual'));

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
    OR split_part(name, '/', 1) = public.current_user_firm_id()::text
  )
);

DROP POLICY IF EXISTS subscription_payment_proofs_insert ON storage.objects;
CREATE POLICY subscription_payment_proofs_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subscription-payment-proofs'
  AND split_part(name, '/', 1) = public.current_user_firm_id()::text
  AND public.current_user_role() = 'SuperAdmin'
);

COMMIT;
