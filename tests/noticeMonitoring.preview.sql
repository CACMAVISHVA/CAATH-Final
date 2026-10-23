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

-- Token is checked in memory, never returned in test output.
do $$declare v jsonb; begin
 v:=public.provision_notice_source('Synthetic source','email');
 if (v->>'token') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid token shape'; end if;
 if (select active from public.notice_monitor_sources where id=(v->>'source_id')::uuid) then raise exception 'New source must start paused'; end if;
end$$;
select pg_temp.expect_failure('select * from public.notice_monitor_keys');
insert into public.notice_client_watches(firm_id,client_id,department) values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Income Tax');
select public.set_notice_source_active(id,true) from public.notice_monitor_sources;
set local role service_role;
select public.ingest_notice_event(id,'event1','fingerprint1','Income Tax',array['AAAAA0000A'],'Synthetic notice','Test only','MON-1','2026-10-23','2026-10-30',null) from public.notice_monitor_sources where label='Synthetic source';
select public.ingest_notice_event(id,'event1','fingerprint1','Income Tax',array['AAAAA0000A'],'Synthetic notice','Test only','MON-1','2026-10-23','2026-10-30',null) from public.notice_monitor_sources where label='Synthetic source';
set local role authenticated;
do $$begin
 if (select count(*) from public.notice_monitor_inbox)<>1 then raise exception 'Duplicate intake'; end if;
 if (select client_id from public.notice_monitor_inbox limit 1)<>'40000000-0000-4000-8000-000000000001'::uuid then raise exception 'Wrong client match'; end if;
end$$;
select public.review_notice_intake(id,client_id,'Income Tax','MON-1','2026-10-23','2026-10-30') from public.notice_monitor_inbox;
select public.review_notice_intake(id,client_id,'Income Tax','MON-1','2026-10-23','2026-10-30') from public.notice_monitor_inbox;
do $$begin
 if (select count(*) from public.notices)<>1 or (select count(*) from public.tasks)<>1 or (select count(*) from public.notice_history)<>1 then raise exception 'Approval must use atomic notice workflow once'; end if;
 if (select notice_id from public.tasks limit 1) is null then raise exception 'Task foreign key missing'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.expect_failure($q$select public.provision_notice_source('Staff denied','email')$q$);
select pg_temp.expect_failure('select public.review_notice_intake(gen_random_uuid(),null,null,null,null,null)');
select pg_temp.expect_failure('select public.sweep_notice_alerts()');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$begin
 if exists(select 1 from public.notice_monitor_inbox) or exists(select 1 from public.notice_monitor_sources) or exists(select 1 from public.notice_client_watches) then raise exception 'Monitoring cross-tenant leak'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.set_notice_source_active(id,false) from public.notice_monitor_sources;
set local role service_role;
select pg_temp.expect_failure($q$select public.ingest_notice_event(id,'paused','paused','Income Tax',array['AAAAA0000A'],'Synthetic','',null,null,null,null) from public.notice_monitor_sources where label='Synthetic source'$q$);
select public.sweep_notice_alerts();
do $$declare before_count integer; begin
 select count(*) into before_count from public.notifications;
 perform public.sweep_notice_alerts();
 if (select count(*) from public.notifications)<>before_count then raise exception 'Sweep duplicated alerts'; end if;
end$$;
reset role;
select 'PASS: paused defaults, secret protection, matching, deduplication, atomic approval, task/history reuse, role and tenant isolation, paused-source rejection, idempotent alerts' as result;
rollback;
