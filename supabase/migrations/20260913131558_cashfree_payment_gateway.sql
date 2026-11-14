BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_gateway_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'Cashfree' CHECK (provider = 'Cashfree'),
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text,
  payment_session_id text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('Starter', 'Professional', 'Enterprise')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  gst_amount numeric(12,2) NOT NULL CHECK (gst_amount >= 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_requests
  ALTER COLUMN utr_number DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS gateway_order_id uuid;

ALTER TABLE public.subscription_requests DROP CONSTRAINT IF EXISTS subscription_requests_payment_provider_check;
ALTER TABLE public.subscription_requests
  ADD CONSTRAINT subscription_requests_payment_provider_check
  CHECK (payment_provider IN ('Manual', 'Cashfree'));

ALTER TABLE public.subscription_requests DROP CONSTRAINT IF EXISTS subscription_requests_manual_proof_check;
ALTER TABLE public.subscription_requests
  ADD CONSTRAINT subscription_requests_manual_proof_check
  CHECK (payment_provider <> 'Manual' OR nullif(trim(utr_number), '') IS NOT NULL);

ALTER TABLE public.subscription_requests DROP CONSTRAINT IF EXISTS subscription_requests_fk_gateway_order;
ALTER TABLE public.subscription_requests
  ADD CONSTRAINT subscription_requests_fk_gateway_order
  FOREIGN KEY (gateway_order_id) REFERENCES public.payment_gateway_orders(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_requests_gateway_order
  ON public.subscription_requests(gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_gateway_orders_firm_created
  ON public.payment_gateway_orders(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_orders_status
  ON public.payment_gateway_orders(status, updated_at DESC);

ALTER TABLE public.payment_gateway_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_gateway_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_gateway_orders TO authenticated;

DROP POLICY IF EXISTS payment_gateway_orders_read ON public.payment_gateway_orders;
CREATE POLICY payment_gateway_orders_read
ON public.payment_gateway_orders
FOR SELECT
TO authenticated
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND created_by = public.current_user_profile_id()
  )
);

COMMIT;
