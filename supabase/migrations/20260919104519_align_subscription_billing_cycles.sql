BEGIN;

ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS screenshot_path text;

ALTER TABLE public.subscription_requests
  DROP CONSTRAINT IF EXISTS subscription_requests_billing_cycle_check;
ALTER TABLE public.subscription_requests
  ADD CONSTRAINT subscription_requests_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Annual'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Annual'));

COMMIT;
