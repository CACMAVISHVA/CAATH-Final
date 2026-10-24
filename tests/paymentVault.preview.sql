-- Preview only; synthetic demo fixtures required. All mutations roll back.
begin;
insert into public.payment_gateway_orders(id,firm_id,created_by,provider_order_id,payment_session_id,plan,billing_cycle,amount,gst_amount,total_amount)
values('81000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','security-preview-only','synthetic','CAATH Practice OS','Monthly',1499,0,1499);
set local role service_role;
select public.complete_cashfree_payment('81000000-0000-4000-8000-000000000001','synthetic-payment');
do $$ declare expires timestamptz; begin
 select expires_at into expires from public.subscriptions where firm_id='72000000-0000-4000-8000-000000000001' order by created_at desc limit 1;
 perform public.complete_cashfree_payment('81000000-0000-4000-8000-000000000001','synthetic-payment');
 if (select expires_at from public.subscriptions where firm_id='72000000-0000-4000-8000-000000000001' order by created_at desc limit 1) is distinct from expires then raise exception 'Duplicate extended subscription'; end if;
 update public.payment_gateway_orders set status='FAILED' where id='81000000-0000-4000-8000-000000000001';
 if (select status from public.payment_gateway_orders where id='81000000-0000-4000-8000-000000000001')<>'PAID' then raise exception 'Paid downgraded'; end if;
 if (select count(*) from public.subscription_requests where gateway_order_id='81000000-0000-4000-8000-000000000001')<>1 then raise exception 'Duplicate request'; end if;
 if not public.consume_security_rate_limit('test','synthetic',2,60) then raise exception 'First blocked'; end if;
 if not public.consume_security_rate_limit('test','synthetic',2,60) then raise exception 'Second blocked'; end if;
 if public.consume_security_rate_limit('test','synthetic',2,60) then raise exception 'Limit bypass'; end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('authenticated','public.complete_cashfree_payment(uuid,text)','execute') or has_function_privilege('anon','public.consume_security_rate_limit(text,text,integer,integer)','execute') then raise exception 'Public RPC exposure'; end if;
end $$;
rollback;
select 'PASS: duplicate activation, paid-state protection, rate counter and service-only RPCs' as result;
