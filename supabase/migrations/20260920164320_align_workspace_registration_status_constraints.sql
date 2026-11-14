BEGIN;

ALTER TABLE public.firms
  DROP CONSTRAINT IF EXISTS firms_subscription_status_check;

ALTER TABLE public.firms
  ADD CONSTRAINT firms_subscription_status_check
  CHECK (subscription_status IN (
    'Trial',
    'Pending Verification',
    'Pending Payment',
    'Pending Subscription',
    'Active',
    'Expired',
    'Suspended',
    'Cancelled',
    'Rejected'
  ));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'Pending',
    'Trial',
    'Pending Verification',
    'Pending Payment',
    'Active',
    'Expired',
    'Cancelled',
    'Suspended',
    'Rejected'
  ));

COMMIT;
