-- Run ONLY on an isolated preview. Synthetic fixtures are rolled back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','manager@phase1.invalid'),
 ('10000000-0000-4000-8000-000000000002','staff@phase1.invalid'),
 ('10000000-0000-4000-8000-000000000003','client@phase1.invalid'),
 ('10000000-0000-4000-8000-000000000004','other@phase1.invalid');
insert into public.firms(id,name,subscription_plan) values ('20000000-0000-4000-8000-000000000001','Preview A','CAATH Practice OS'),('20000000-0000-4000-8000-000000000002','Preview B','CAATH Practice OS');
insert into public.users(id,auth_id,firm_id,name,email,role) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Manager','manager@phase1.invalid','SuperAdmin'),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Staff','staff@phase1.invalid','Staff'),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Client','client@phase1.invalid','Client'),
 ('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','Other','other@phase1.invalid','SuperAdmin');
insert into public.clients(id,firm_id,name,type,pan) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic A','Others','AAAAA0000A'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Synthetic B','Others','BBBBB0000B');
create function pg_temp.expect_failure(stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'Expected failure: %',stmt;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001','TEST-1','GST','2026-10-23','2026-11-01','Test facts',null,'50000000-0000-4000-8000-000000000001');
select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001','TEST-1','GST','2026-10-23','2026-11-01','Test facts',null,'50000000-0000-4000-8000-000000000001');
do $$begin
 if (select count(*) from public.notices)<>1 or (select count(*) from public.tasks)<>1 then raise exception 'Retry duplicated notice/task'; end if;
end$$;
select pg_temp.expect_failure($q$select public.create_notice_intelligence('40000000-0000-4000-8000-000000000002','CROSS','GST','2026-10-23','2026-11-01','',null,gen_random_uuid())$q$);
select pg_temp.expect_failure($q$select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001',' test-1 ','GST','2026-10-23','2026-11-01','',null,gen_random_uuid())$q$);
select pg_temp.expect_failure($q$select public.update_notice_intelligence(id,0,'Filed',null,'','') from public.notices$q$);
select public.update_notice_intelligence(id,0,'Assigned','30000000-0000-4000-8000-000000000002','','') from public.notices;
select pg_temp.expect_failure($q$select public.update_notice_intelligence(id,0,'Drafting',assigned_to,'','') from public.notices$q$);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.update_notice_intelligence(id,1,'Drafting',assigned_to,'Working draft','') from public.notices;
select public.update_notice_intelligence(id,2,'Drafted',assigned_to,'Reviewed facts, evidence pending','') from public.notices;
select pg_temp.expect_failure($q$update public.notices set status='Filed',filing_reference='fake' $q$);
select pg_temp.expect_failure($q$select public.update_notice_intelligence(id,3,'Filed',assigned_to,'Draft','REF') from public.notices$q$);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.update_notice_intelligence(id,3,'Under_Review',assigned_to,'Ready for review','') from public.notices;
select public.update_notice_intelligence(id,4,'Filed',assigned_to,'Approved manually','MANUAL-REF') from public.notices;
do $$begin
 if (select status from public.tasks limit 1)<>'Completed' then raise exception 'Task not synchronized'; end if;
 if (select count(*) from public.notifications where title like 'Notice workflow %')<>1 then raise exception 'Notification retry or lifecycle failure'; end if;
 if (select count(*) from public.notice_history)<>6 then raise exception 'History missing'; end if;
end$$;
set local role service_role;
do $$begin
 if (select count(*) from public.notifications where firm_id='20000000-0000-4000-8000-000000000001' and title like 'Notice workflow %')<>6 then raise exception 'Notification delivery count changed'; end if;
end$$;
set local role authenticated;
insert into public.crm_leads(id,firm_id,name,next_follow_up) values('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic lead','2026-10-23');
select pg_temp.expect_failure($q$select public.convert_crm_lead('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002')$q$);
select public.convert_crm_lead('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
select public.convert_crm_lead('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
select pg_temp.expect_failure($q$update public.crm_leads set stage='New',client_id=null$q$);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$begin
 if exists(select 1 from public.notices) or exists(select 1 from public.crm_leads) or exists(select 1 from public.notice_history) then raise exception 'Cross-tenant data leak'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_failure($q$select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001','BAD','GST','2026-10-23','2026-11-01','',null,gen_random_uuid())$q$);
select pg_temp.expect_failure($q$insert into public.notices(firm_id,client_id,source,notice_number,received_date,deadline) values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','GST','BAD','2026-10-23','2026-11-01')$q$);
select pg_temp.expect_failure($q$insert into public.crm_leads(firm_id,name) values('20000000-0000-4000-8000-000000000001','BAD')$q$);
set local role anon;
select pg_temp.expect_failure($q$select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001','BAD','GST','2026-10-23','2026-11-01','',null,gen_random_uuid())$q$);
reset role;
-- Force a downstream insert failure; no notice should survive.
create function pg_temp.fail_task() returns trigger language plpgsql as $$begin raise exception 'Synthetic task failure'; end$$;
create trigger phase1_fail_task before insert on public.tasks for each row execute function pg_temp.fail_task();
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.expect_failure($q$select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001','ROLLBACK','GST','2026-10-23','2026-11-01','',null,gen_random_uuid())$q$);
do $$begin if (select count(*) from public.notifications where title like 'Notice workflow %')<>1 then raise exception 'Notification rollback failure'; end if; if exists(select 1 from public.notices where notice_number='ROLLBACK') then raise exception 'Atomicity failure'; end if; end$$;
reset role;
select 'PASS: retries, duplicate prevention, lifecycle, optimistic concurrency, task sync, history, conversion, closed lead guard, cross-tenant isolation, client/anon denial and atomic rollback' as result;
rollback;
