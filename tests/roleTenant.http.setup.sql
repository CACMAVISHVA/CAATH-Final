-- PREVIEW ONLY. Creates synthetic accounts for HTTP tests. Run cleanup afterward.
-- ISOLATED PREVIEW ONLY. Synthetic fixtures; every change rolls back.
begin;
do $$begin if length(coalesce(current_setting('caath.preview_test_password',true),''))<20 then raise exception 'Set a strong synthetic preview password in this SQL session first'; end if; end$$;
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
update auth.users set instance_id='00000000-0000-0000-0000-000000000000',aud='authenticated',role='authenticated',encrypted_password=extensions.crypt(current_setting('caath.preview_test_password'),extensions.gen_salt('bf')),email_confirmed_at=now(),created_at=now(),updated_at=now(),confirmation_token='',recovery_token='',email_change_token_new='',email_change='',raw_app_meta_data='{"provider":"email","providers":["email"]}',raw_user_meta_data='{}' where id in ('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000005','91000000-0000-4000-8000-000000000006');
commit;
