begin;
-- Service-only atomic counters. No bearer client can read or increment them.
create table if not exists public.security_rate_limits (
 id uuid primary key default gen_random_uuid(), scope text not null, actor_key text not null,
 window_start timestamptz not null, request_count integer not null default 0,
 updated_at timestamptz not null default now(), unique(scope,actor_key,window_start)
);
alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public,anon,authenticated;
grant all on public.security_rate_limits to service_role;
create or replace function public.consume_security_rate_limit(p_scope text,p_actor text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer; w timestamptz;
begin
 if p_limit<1 or p_limit>10000 or p_window_seconds<1 or p_window_seconds>86400 or length(p_scope)>100 or length(p_actor)>100 then raise exception 'Invalid rate limit'; end if;
 w:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
 insert into public.security_rate_limits(scope,actor_key,window_start,request_count) values(p_scope,p_actor,w,1)
 on conflict(scope,actor_key,window_start) do update set request_count=public.security_rate_limits.request_count+1,updated_at=now()
 where public.security_rate_limits.request_count<p_limit
 returning request_count into n;
 return n is not null;
end $$;
revoke all on function public.consume_security_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_security_rate_limit(text,text,integer,integer) to service_role;

-- Protect PAID even when older server routes or concurrent callbacks write.
create function public.guard_paid_gateway_order() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='PAID' then
  new.status:='PAID'; new.paid_at:=old.paid_at;
  new.provider_payment_id:=coalesce(old.provider_payment_id,new.provider_payment_id);
 end if;
 return new;
end $$;
revoke all on function public.guard_paid_gateway_order() from public,anon,authenticated;
create trigger protect_paid_gateway_order before update on public.payment_gateway_orders for each row execute function public.guard_paid_gateway_order();

-- Serializes callback/browser reconciliation and subscription activation in one transaction.
create function public.complete_cashfree_payment(p_order_id uuid,p_payment_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.payment_gateway_orders; r public.subscription_requests; decision jsonb;
begin
 select * into o from public.payment_gateway_orders where id=p_order_id for update;
 if not found or o.provider<>'Cashfree' then raise exception 'Payment order unavailable'; end if;
 update public.payment_gateway_orders set status='PAID',provider_payment_id=coalesce(provider_payment_id,nullif(p_payment_id,'')),paid_at=coalesce(paid_at,now()),updated_at=now() where id=o.id returning * into o;
 select * into r from public.subscription_requests where gateway_order_id=o.id;
 if not found then
  insert into public.subscription_requests(reference_number,firm_id,plan,billing_cycle,amount,gst_amount,total_amount,utr_number,payment_provider,gateway_order_id,status,created_by,updated_by)
  values('CF-'||replace(o.id::text,'-',''),o.firm_id,o.plan,o.billing_cycle,o.amount,o.gst_amount,o.total_amount,coalesce(o.provider_payment_id,o.provider_order_id),'Cashfree',o.id,'Pending Verification',o.created_by,o.created_by) returning * into r;
 end if;
 decision:=public.process_paid_subscription_request(r.id);
 return jsonb_build_object('order',to_jsonb(o),'approvalRequest',jsonb_build_object('id',r.id,'reference_number',r.reference_number),'decision',decision);
end $$;
revoke all on function public.complete_cashfree_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_cashfree_payment(uuid,text) to service_role;
commit;
