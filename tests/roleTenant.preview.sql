-- ISOLATED PREVIEW ONLY. Synthetic fixtures; every change rolls back.
begin;
insert into auth.users(id,email) values
 ('91000000-0000-4000-8000-000000000001','owner@roles.invalid'),
 ('91000000-0000-4000-8000-000000000002','admin@roles.invalid'),
 ('91000000-0000-4000-8000-000000000003','staff@roles.invalid'),
 ('91000000-0000-4000-8000-000000000004','client@roles.invalid'),
 ('91000000-0000-4000-8000-000000000005','other@roles.invalid'),
 ('91000000-0000-4000-8000-000000000006','platform@roles.invalid');
insert into public.firms(id,name,subscription_plan,status) values
 ('92000000-0000-4000-8000-000000000001','Role Test A','CAATH Practice OS','Active'),
 ('92000000-0000-4000-8000-000000000002','Role Test B','CAATH Practice OS','Active');
insert into public.users(id,auth_id,firm_id,name,email,role) values
 ('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Owner','owner@roles.invalid','SuperAdmin'),
 ('93000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','Admin','admin@roles.invalid','Admin'),
 ('93000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','Staff','staff@roles.invalid','Staff'),
 ('93000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','Client','client@roles.invalid','Client'),
 ('93000000-0000-4000-8000-000000000005','91000000-0000-4000-8000-000000000005','92000000-0000-4000-8000-000000000002','Other Owner','other@roles.invalid','SuperAdmin'),
 ('93000000-0000-4000-8000-000000000006','91000000-0000-4000-8000-000000000006',null,'Platform','platform@roles.invalid','GodAdmin');
insert into public.clients(id,firm_id,name,type,pan,gstin) values
 ('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Linked synthetic','Others','AAAAA0000A','33AAAAA0000A1Z5'),
 ('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Foreign synthetic','Others','BBBBB0000B','33BBBBB0000B1Z5'),
 ('94000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','Unlinked synthetic','Others','CCCCC0000C','33CCCCC0000C1Z5');
insert into public.client_contacts(firm_id,client_id,user_id) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000004');
insert into public.notifications(id,firm_id,recipient_user_id,title,message,status,created_by) values('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000003','Private staff alert','Synthetic','UNREAD','93000000-0000-4000-8000-000000000001');
insert into public.gst_return_statuses(firm_id,client_id,gstin,financial_year,return_type,tax_period,status,updated_by) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000003','33CCCCC0000C1Z5','2026-27','GSTR-1','2026-10','Pending','93000000-0000-4000-8000-000000000001');

insert into public.tasks(firm_id,client_id,title,status) select firm_id,id,'Synthetic role task','Created' from public.clients where id::text like '94000000-%';
insert into public.notices(firm_id,client_id,notice_number,source,received_date,deadline) select firm_id,id,'ROLE-'||right(id::text,1),'GST','2026-10-25','2026-10-31' from public.clients where id::text like '94000000-%';
insert into public.documents(firm_id,client_id,name,storage_path,category,status,workflow_stage,visible_to_client) select firm_id,id,'Role test','synthetic/not-a-real-object','Other','CLIENT_VISIBLE','CLIENT_VISIBLE',true from public.clients where id::text like '94000000-%';
insert into public.documents(firm_id,client_id,name,storage_path,category,status,workflow_stage,visible_to_client) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Hidden synthetic','synthetic/hidden','Internal','PENDING','ADMIN_REVIEW',false);
insert into public.gst_return_statuses(firm_id,client_id,gstin,financial_year,return_type,tax_period,status,updated_by) select firm_id,id,gstin,'2026-27','GSTR-1','2026-10','Pending',case when firm_id='92000000-0000-4000-8000-000000000001' then '93000000-0000-4000-8000-000000000001'::uuid else '93000000-0000-4000-8000-000000000005'::uuid end from public.clients where id::text like '94000000-%' and id<>'94000000-0000-4000-8000-000000000003';
insert into public.notifications(firm_id,recipient_user_id,audience_role,title,message,status) values
 ('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000004',null,'Client alert','Synthetic','UNREAD'),
 ('92000000-0000-4000-8000-000000000001',null,'Admin','Manager alert','Synthetic','UNREAD'),
 ('92000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000005',null,'Foreign alert','Synthetic','UNREAD');
create function pg_temp.can_execute(stmt text) returns boolean language plpgsql as $$
declare n integer;
begin
 begin execute stmt; get diagnostics n=row_count; raise sqlstate 'PT001';
 exception when sqlstate 'PT001' then return n>0; when others then return false; end;
end $$;
create function pg_temp.check_true(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'ROLE TEST FAILED: %',label; end if; end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true(((select count(*) from public.clients where id::text like '94000000-%')=2),'SuperAdmin reads own firm clients');
select pg_temp.check_true((not exists(select 1 from public.clients where firm_id='92000000-0000-4000-8000-000000000002')),'SuperAdmin cannot read foreign clients');
select pg_temp.check_true((not exists(select 1 from public.tasks where firm_id='92000000-0000-4000-8000-000000000002')),'SuperAdmin cannot read foreign tasks');
select pg_temp.check_true((not exists(select 1 from public.documents where firm_id='92000000-0000-4000-8000-000000000002')),'SuperAdmin cannot read foreign documents');
select pg_temp.check_true((not exists(select 1 from public.notices where firm_id='92000000-0000-4000-8000-000000000002')),'SuperAdmin cannot read foreign notices');
select pg_temp.check_true((not exists(select 1 from public.gst_return_statuses where firm_id='92000000-0000-4000-8000-000000000002')),'SuperAdmin cannot read foreign gst_return_statuses');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.tasks(firm_id,client_id,title,status) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','Forbidden','Created')$deny$)),'SuperAdmin foreign task client blocked');
select pg_temp.check_true((pg_temp.can_execute($allow$update public.tasks set title='Permitted' where client_id='94000000-0000-4000-8000-000000000001'$allow$)),'SuperAdmin legitimate task update works');
select pg_temp.check_true((not exists(select 1 from public.notifications where title='Client alert')),'SuperAdmin cannot read private client alert');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.notifications(firm_id,recipient_user_id,title,message,status) values('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000005','Forbidden','Synthetic','UNREAD')$deny$)),'SuperAdmin foreign recipient blocked');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.gst_return_statuses set client_id='94000000-0000-4000-8000-000000000002',updated_by=public.current_user_profile_id() where client_id='94000000-0000-4000-8000-000000000001'$deny$)),'SuperAdmin foreign GST update blocked');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.check_true(((select count(*) from public.clients where id::text like '94000000-%')=2),'Admin reads own firm clients');
select pg_temp.check_true((not exists(select 1 from public.clients where firm_id='92000000-0000-4000-8000-000000000002')),'Admin cannot read foreign clients');
select pg_temp.check_true((not exists(select 1 from public.tasks where firm_id='92000000-0000-4000-8000-000000000002')),'Admin cannot read foreign tasks');
select pg_temp.check_true((not exists(select 1 from public.documents where firm_id='92000000-0000-4000-8000-000000000002')),'Admin cannot read foreign documents');
select pg_temp.check_true((not exists(select 1 from public.notices where firm_id='92000000-0000-4000-8000-000000000002')),'Admin cannot read foreign notices');
select pg_temp.check_true((not exists(select 1 from public.gst_return_statuses where firm_id='92000000-0000-4000-8000-000000000002')),'Admin cannot read foreign gst_return_statuses');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.tasks(firm_id,client_id,title,status) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','Forbidden','Created')$deny$)),'Admin foreign task client blocked');
select pg_temp.check_true((pg_temp.can_execute($allow$update public.tasks set title='Permitted' where client_id='94000000-0000-4000-8000-000000000001'$allow$)),'Admin legitimate task update works');
select pg_temp.check_true((not exists(select 1 from public.notifications where title='Client alert')),'Admin cannot read private client alert');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.notifications(firm_id,recipient_user_id,title,message,status) values('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000005','Forbidden','Synthetic','UNREAD')$deny$)),'Admin foreign recipient blocked');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.gst_return_statuses set client_id='94000000-0000-4000-8000-000000000002',updated_by=public.current_user_profile_id() where client_id='94000000-0000-4000-8000-000000000001'$deny$)),'Admin foreign GST update blocked');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_true(((select count(*) from public.clients where id::text like '94000000-%')=2),'Staff reads own firm clients');
select pg_temp.check_true((not exists(select 1 from public.clients where firm_id='92000000-0000-4000-8000-000000000002')),'Staff cannot read foreign clients');
select pg_temp.check_true((not exists(select 1 from public.tasks where firm_id='92000000-0000-4000-8000-000000000002')),'Staff cannot read foreign tasks');
select pg_temp.check_true((not exists(select 1 from public.documents where firm_id='92000000-0000-4000-8000-000000000002')),'Staff cannot read foreign documents');
select pg_temp.check_true((not exists(select 1 from public.notices where firm_id='92000000-0000-4000-8000-000000000002')),'Staff cannot read foreign notices');
select pg_temp.check_true((not exists(select 1 from public.gst_return_statuses where firm_id='92000000-0000-4000-8000-000000000002')),'Staff cannot read foreign gst_return_statuses');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.tasks(firm_id,client_id,title,status) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','Forbidden','Created')$deny$)),'Staff foreign task client blocked');
select pg_temp.check_true((pg_temp.can_execute($allow$update public.tasks set title='Permitted' where client_id='94000000-0000-4000-8000-000000000001'$allow$)),'Staff legitimate task update works');
select pg_temp.check_true((not exists(select 1 from public.notifications where title='Client alert')),'Staff cannot read private client alert');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.notifications(firm_id,recipient_user_id,title,message,status) values('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000005','Forbidden','Synthetic','UNREAD')$deny$)),'Staff foreign recipient blocked');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.gst_return_statuses set client_id='94000000-0000-4000-8000-000000000002',updated_by=public.current_user_profile_id() where client_id='94000000-0000-4000-8000-000000000001'$deny$)),'Staff foreign GST update blocked');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true((exists(select 1 from public.notifications where title='Manager alert')),'SuperAdmin receives manager audience');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.client_contacts(firm_id,client_id,user_id) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000004')$deny$)),'Foreign contact linkage blocked');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.documents(firm_id,client_id,name,storage_path,category) values('92000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','Forbidden','synthetic/forbidden','Other')$deny$)),'Foreign document linkage blocked');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.gst_return_statuses set gstin='33WRONG0000X1Z5',updated_by=public.current_user_profile_id() where client_id='94000000-0000-4000-8000-000000000001'$deny$)),'Mismatched GSTIN blocked');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.users set role='Staff',is_workspace_owner=false where id='93000000-0000-4000-8000-000000000001'$deny$)),'Admin cannot demote SuperAdmin');
select pg_temp.check_true((pg_temp.can_execute($allow$update public.users set name='Permitted Staff Name' where id='93000000-0000-4000-8000-000000000003'$allow$)),'Admin can manage Staff');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_true((exists(select 1 from public.notifications where title='Private staff alert')),'Staff receives private alert');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.notifications set message='Forged' where title='Private staff alert'$deny$)),'Staff cannot rewrite alert content');
select pg_temp.check_true((pg_temp.can_execute($allow$update public.notifications set status='READ' where title='Private staff alert'$allow$)),'Staff may mark own alert read');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.users set role='Admin' where id='93000000-0000-4000-8000-000000000003'$deny$)),'Staff cannot promote self');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
select pg_temp.check_true(((select count(*) from public.clients where id::text like '94000000-%')=1),'Client sees only linked clients');
select pg_temp.check_true(((select count(*) from public.notices where client_id::text like '94000000-%')=1),'Client sees only linked notices');
select pg_temp.check_true(((select count(*) from public.gst_return_statuses where client_id::text like '94000000-%')=1),'Client sees only linked gst_return_statuses');
select pg_temp.check_true(((select count(*) from public.documents where client_id::text like '94000000-%')=1),'Client sees only approved linked document');
select pg_temp.check_true((exists(select 1 from public.notifications where title='Client alert') and not exists(select 1 from public.notifications where title in ('Private staff alert','Manager alert','Foreign alert'))),'Client private notification boundaries');
select pg_temp.check_true((not exists(select 1 from public.tasks)),'Client cannot read internal tasks');
select pg_temp.check_true((not exists(select 1 from public.crm_leads)),'Client cannot read internal crm_leads');
select pg_temp.check_true((not exists(select 1 from public.notice_history)),'Client cannot read internal notice_history');
select pg_temp.check_true((not exists(select 1 from public.notice_monitor_sources)),'Client cannot read internal notice_monitor_sources');
select pg_temp.check_true((not exists(select 1 from public.notice_monitor_inbox)),'Client cannot read internal notice_monitor_inbox');
select pg_temp.check_true((not pg_temp.can_execute($deny$insert into public.notifications(title,message,status) values('Global forgery','Forbidden','UNREAD')$deny$)),'Client cannot publish global alert');
select pg_temp.check_true((not pg_temp.can_execute($deny$update public.users set role='Admin' where id='93000000-0000-4000-8000-000000000004'$deny$)),'Client cannot promote self');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000005',true);
select pg_temp.check_true((not exists(select 1 from public.clients where firm_id='92000000-0000-4000-8000-000000000001')),'Second firm cannot read first firm clients');
select pg_temp.check_true((not exists(select 1 from public.tasks where firm_id='92000000-0000-4000-8000-000000000001')),'Second firm cannot read first firm tasks');
select pg_temp.check_true((not exists(select 1 from public.documents where firm_id='92000000-0000-4000-8000-000000000001')),'Second firm cannot read first firm documents');
select pg_temp.check_true((not exists(select 1 from public.notices where firm_id='92000000-0000-4000-8000-000000000001')),'Second firm cannot read first firm notices');
select pg_temp.check_true((not exists(select 1 from public.gst_return_statuses where firm_id='92000000-0000-4000-8000-000000000001')),'Second firm cannot read first firm gst_return_statuses');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000006',true);
select pg_temp.check_true(((select count(*) from public.clients where id::text like '94000000-%')=3),'GodAdmin has intentional platform visibility');
reset role;
update public.users set deleted_at=now() where id='93000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.check_true((public.current_user_role() is null and public.current_user_profile_id() is null and public.current_user_firm_id() is null),'Soft-deleted session loses role helpers');
select pg_temp.check_true((not exists(select 1 from public.tasks)),'Soft-deleted session cannot read tasks');
set local role anon;
select pg_temp.check_true((not pg_temp.can_execute($deny$select 1 from public.clients$deny$)),'Anonymous denied clients');
select pg_temp.check_true((not pg_temp.can_execute($deny$select 1 from public.tasks$deny$)),'Anonymous denied tasks');
select pg_temp.check_true((not pg_temp.can_execute($deny$select 1 from public.documents$deny$)),'Anonymous denied documents');
select pg_temp.check_true((not pg_temp.can_execute($deny$select 1 from public.notices$deny$)),'Anonymous denied notices');
select pg_temp.check_true((not pg_temp.can_execute($deny$select 1 from public.gst_return_statuses$deny$)),'Anonymous denied gst_return_statuses');
select pg_temp.check_true((not pg_temp.can_execute($deny$select 1 from public.notifications$deny$)),'Anonymous denied notifications');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
select pg_temp.check_true(not pg_temp.can_execute($deny$insert into public.audit_logs(firm_id,user_name,user_role,action,entity_type,details) values('92000000-0000-4000-8000-000000000001','Forged','SuperAdmin','portal_credential_revealed','portal_credentials','Forbidden')$deny$),'Client cannot forge secure vault audit');
insert into public.audit_logs(id,firm_id,user_id,user_name,user_role,action,entity_type,details) values('96000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Forged','SuperAdmin','role-test-client-reported','Tests','Synthetic');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true(exists(select 1 from public.audit_logs where id='96000000-0000-4000-8000-000000000001' and user_id='93000000-0000-4000-8000-000000000004' and user_role='Client' and user_name='Client'),'Audit actor comes from authenticated profile');
select pg_temp.check_true(not pg_temp.can_execute($deny$update public.audit_logs set details='Rewritten' where id='96000000-0000-4000-8000-000000000001'$deny$),'Audit history cannot be rewritten');
select pg_temp.check_true(not pg_temp.can_execute($deny$delete from public.audit_logs where id='96000000-0000-4000-8000-000000000001'$deny$),'Audit history cannot be deleted');
reset role;
select 'PASS: 73 role/tenant assertions; all synthetic changes rolled back' as result;
rollback;
