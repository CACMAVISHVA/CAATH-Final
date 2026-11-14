-- Preserve existing in-app alerts inside the notice transaction. No external delivery.
begin;
create or replace function public.create_notice_intelligence(p_client_id uuid, p_number text, p_source text, p_received date, p_deadline date, p_description text, p_assigned_to uuid, p_request_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_firm uuid := public.current_user_firm_id(); v_actor uuid := public.current_user_profile_id(); v_id uuid; v_existing public.notices; v_role text := public.current_user_role();
begin
  if v_firm is null or v_role not in ('SuperAdmin','Admin','Staff') then raise exception 'Internal workspace access required'; end if;
  if nullif(trim(p_number),'') is null or p_received is null or p_deadline is null or p_deadline < p_received or p_request_id is null or p_source not in ('GST','Income Tax','MCA','Other') then raise exception 'Invalid notice input'; end if;
  if not exists(select 1 from public.clients where id=p_client_id and firm_id=v_firm) then raise exception 'Client is outside workspace'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.users where id=p_assigned_to and firm_id=v_firm and status='Active' and ((v_role='SuperAdmin' and role in ('SuperAdmin','Admin','Staff')) or (v_role='Admin' and role='Staff'))) then raise exception 'Assignment not permitted'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_firm::text || p_request_id::text, 0));
  select * into v_existing from public.notices where firm_id=v_firm and request_id=p_request_id;
  if found then
    if v_existing.client_id<>p_client_id or v_existing.notice_number<>trim(p_number) then raise exception 'Request identifier already used'; end if;
    return v_existing.id;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_firm::text || p_client_id::text || p_source || lower(trim(p_number)), 1));
  if exists(select 1 from public.notices where firm_id=v_firm and client_id=p_client_id and source=p_source and lower(trim(notice_number))=lower(trim(p_number))) then raise exception 'This notice is already recorded for the client'; end if;
  insert into public.notices(firm_id,client_id,notice_number,source,received_date,deadline,description,assigned_to,status,created_by,updated_by,request_id)
  values(v_firm,p_client_id,trim(p_number),p_source,p_received,p_deadline,p_description,p_assigned_to,case when p_assigned_to is null then 'Received' else 'Assigned' end,v_actor,v_actor,p_request_id) returning id into v_id;
  insert into public.tasks(firm_id,client_id,notice_id,title,description,priority,status,category,deadline,assigned_to,created_by,updated_by)
  values(v_firm,p_client_id,v_id,'Notice Response ('||trim(p_number)||') - '||p_source,coalesce(p_description,'')||E'\n[NOTICE_WORKFLOW:'||v_id::text||']','High',case when p_assigned_to is null then 'Created' else 'Assigned' end,case when p_source='MCA' then 'ROC' else p_source end,p_deadline::timestamp at time zone 'Asia/Kolkata',p_assigned_to,v_actor,v_actor);
  insert into public.notice_history(firm_id,notice_id,actor_id,event_type,to_status) values(v_firm,v_id,v_actor,'Created',case when p_assigned_to is null then 'Received' else 'Assigned' end);
  insert into public.notifications(firm_id,recipient_user_id,title,message,status,priority,created_by,updated_by)
  values(v_firm,coalesce(p_assigned_to,v_actor),'Notice workflow created',
    'Notice '||trim(p_number)||' requires attention. Open Notice Center to review the linked task.',
    'UNREAD','HIGH',v_actor,v_actor);
  return v_id;
end $$;
revoke all on function public.create_notice_intelligence(uuid,text,text,date,date,text,uuid,uuid) from public, anon;
grant execute on function public.create_notice_intelligence(uuid,text,text,date,date,text,uuid,uuid) to authenticated;

create or replace function public.update_notice_intelligence(p_id uuid, p_version integer, p_status text, p_assigned_to uuid, p_draft text, p_filing_reference text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare n public.notices; v_role text := public.current_user_role(); v_allowed text[]; v_task_status text;
begin
  if public.current_user_firm_id() is null or v_role not in ('SuperAdmin','Admin','Staff') then raise exception 'Internal workspace access required'; end if;
  select * into n from public.notices where id=p_id and firm_id=public.current_user_firm_id() for update;
  if not found then raise exception 'Notice unavailable'; end if;
  if n.version<>p_version then raise exception 'Notice changed. Reload before saving'; end if;
  if n.status='Archived' then raise exception 'Archived notices are read-only'; end if;
  if p_assigned_to is distinct from n.assigned_to and p_assigned_to is not null and not exists(select 1 from public.users where id=p_assigned_to and firm_id=n.firm_id and status='Active' and ((v_role='SuperAdmin' and role in ('SuperAdmin','Admin','Staff')) or (v_role='Admin' and role='Staff'))) then raise exception 'Assignment not permitted'; end if;
  if v_role='Staff' and (p_assigned_to is distinct from n.assigned_to or p_status in ('Filed','Closed','Archived')) then raise exception 'Manager review required'; end if;
  v_allowed := case n.status
    when 'Received' then array['Assigned','Escalated','Archived']
    when 'Assigned' then array['Drafting','Under_Review','Escalated','Reassigned','Archived']
    when 'Drafting' then array['Drafted','Under_Review','Escalated','Reassigned','Archived']
    when 'Drafted' then array['Under_Review','Filed','Escalated','Reassigned','Archived']
    when 'Under_Review' then array['Filed','Escalated','Reassigned','Archived']
    when 'Escalated' then array['Assigned','Drafting','Under_Review','Filed','Reassigned','Archived']
    when 'Reassigned' then array['Assigned','Drafting','Under_Review','Escalated','Archived']
    when 'Filed' then array['Closed','Archived'] when 'Closed' then array['Archived'] else array[]::text[] end;
  if p_status is null or (p_status<>n.status and not p_status=any(v_allowed)) then raise exception 'Invalid notice transition'; end if;
  if p_status in ('Assigned','Reassigned') and p_assigned_to is null then raise exception 'Choose an owner'; end if;
  if p_status in ('Drafted','Under_Review') and nullif(trim(p_draft),'') is null then raise exception 'A reply draft is required'; end if;
  if p_status='Filed' and nullif(trim(p_filing_reference),'') is null then raise exception 'Record the manual filing acknowledgement'; end if;
  update public.notices set status=p_status, assigned_to=p_assigned_to, reply_draft=p_draft, filing_reference=p_filing_reference, version=version+1, updated_by=public.current_user_profile_id(), updated_at=now() where id=p_id;
  v_task_status := case p_status when 'Received' then 'Created' when 'Assigned' then 'Assigned' when 'Drafting' then 'In Progress' when 'Drafted' then 'Under Review' when 'Under_Review' then 'Under Review' when 'Filed' then 'Completed' when 'Closed' then 'Archived' else p_status end;
  update public.tasks set status=v_task_status, assigned_to=p_assigned_to, updated_by=public.current_user_profile_id(),updated_at=now()
    where firm_id=n.firm_id and (notice_id=p_id or (notice_id is null and position('[NOTICE_WORKFLOW:'||p_id::text||']' in coalesce(description,''))>0));
  insert into public.notice_history(firm_id,notice_id,actor_id,event_type,from_status,to_status) values(n.firm_id,n.id,public.current_user_profile_id(),'Updated',n.status,p_status);
  if p_status is distinct from n.status or p_assigned_to is distinct from n.assigned_to then
    insert into public.notifications(firm_id,recipient_user_id,title,message,status,priority,created_by,updated_by)
    values(n.firm_id,coalesce(p_assigned_to,public.current_user_profile_id()),'Notice workflow updated',
      'Notice '||n.notice_number||' is now '||replace(p_status,'_',' ')||'. Open Notice Center to review.',
      'UNREAD',case when p_status='Escalated' then 'CRITICAL' else 'HIGH' end,
      public.current_user_profile_id(),public.current_user_profile_id());
  end if;
  return n.version+1;
end $$;
revoke all on function public.update_notice_intelligence(uuid,integer,text,uuid,text,text) from public, anon;
grant execute on function public.update_notice_intelligence(uuid,integer,text,uuid,text,text) to authenticated;

commit;
