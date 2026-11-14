BEGIN;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS client_limit integer NOT NULL DEFAULT 10 CHECK (client_limit >= 0),
  ADD COLUMN IF NOT EXISTS staff_limit integer NOT NULL DEFAULT 3 CHECK (staff_limit >= 0),
  ADD COLUMN IF NOT EXISTS storage_limit_gb integer NOT NULL DEFAULT 5 CHECK (storage_limit_gb >= 0),
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

UPDATE public.subscriptions
SET start_date = COALESCE(start_date, starts_at, created_at),
    end_date = COALESCE(end_date, expires_at, trial_ends_at),
    next_billing_date = COALESCE(next_billing_date, expires_at, trial_ends_at),
    trial_end_date = COALESCE(trial_end_date, trial_ends_at),
    auto_renew = COALESCE(auto_renew, false)
WHERE start_date IS NULL
   OR end_date IS NULL
   OR next_billing_date IS NULL
   OR trial_end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_firm_next_billing
  ON public.subscriptions(firm_id, next_billing_date);

COMMIT;
