-- Preview only: requires the synthetic demo firm/user/notice fixtures. Rolls back.
begin;
insert into public.subscriptions(firm_id,plan,status) values('72000000-0000-4000-8000-000000000001','CAATH Practice OS','Active');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
do $test$ declare n uuid; i integer; denied boolean:=false; begin
select id into n from public.notices where status<>'Archived' limit 1;
if n is null then raise exception 'Missing synthetic test notice'; end if;
begin perform public.reserve_notice_ai_request('00000000-0000-4000-8000-000000000000'); exception when others then denied:=true; end;
if not denied then raise exception 'Unknown notice accepted'; end if;
for i in 1..5 loop perform public.reserve_notice_ai_request(n); end loop;
denied:=false;
begin perform public.reserve_notice_ai_request(n); exception when others then denied:=true; end;
if not denied then raise exception 'Hourly limit not enforced'; end if;
if (select count(*) from public.notice_ai_requests)<>5 then raise exception 'Wrong attempt count'; end if;
end $test$;
rollback;
