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

select public.create_notice_intelligence('40000000-0000-4000-8000-000000000001','PDF-TEST','GST','2026-10-24','2026-10-30','Synthetic',null,'50000000-0000-4000-8000-000000000001');
insert into storage.objects(bucket_id,name,owner_id,metadata)
select 'notice-documents',firm_id::text||'/'||id::text||'/60000000-0000-4000-8000-000000000001.pdf',auth.uid()::text,'{"size":9,"mimetype":"application/pdf"}'::jsonb from public.notices;
insert into public.notice_documents(id,firm_id,notice_id,name,storage_path,file_size,uploaded_by)
select '60000000-0000-4000-8000-000000000001',firm_id,id,'Synthetic.pdf',firm_id::text||'/'||id::text||'/60000000-0000-4000-8000-000000000001.pdf',9,public.current_user_profile_id() from public.notices;
do $$begin
 if (select count(*) from public.notice_documents)<>1 then raise exception 'Attachment missing'; end if;
 if not exists(select 1 from public.notice_history where event_type='PDF attached: Synthetic.pdf') then raise exception 'Attachment audit missing'; end if;
end$$;
-- Retention policies silently filter forbidden deletes and updates.
select pg_temp.expect_failure('delete from storage.objects where bucket_id=''notice-documents''');
update storage.objects set metadata='{}' where bucket_id='notice-documents';
do $$begin
 if not exists(select 1 from storage.objects where bucket_id='notice-documents' and metadata->>'size'='9') then raise exception 'Retained object was changed'; end if;
end$$;
select pg_temp.expect_failure('delete from public.notice_documents');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$begin
 if exists(select 1 from public.notice_documents) or exists(select 1 from storage.objects where bucket_id='notice-documents') then raise exception 'Cross-tenant leak'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.notice_documents) or exists(select 1 from storage.objects where bucket_id='notice-documents') then raise exception 'Client attachment access'; end if;
end$$;
rollback;
select 'PASS: private document attachment, audit, retention, cross-tenant and client denial' as result;

