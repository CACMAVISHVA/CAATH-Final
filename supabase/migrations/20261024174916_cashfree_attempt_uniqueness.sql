begin;
-- A successful provider payment cannot fulfil two different orders.
create unique index payment_gateway_provider_payment_unique on public.payment_gateway_orders(provider,provider_payment_id) where provider_payment_id is not null;
commit;
