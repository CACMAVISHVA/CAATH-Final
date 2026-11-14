-- Additive Phase 1. Apply to a preview first. No portal access or filing automation.
begin;
alter table public.notices add column if not exists description text;
alter table public.notices add column if not exists version integer not null default 0;
alter table public.notices add column if not exists request_id uuid;
alter table public.notices add column if not exists filing_reference text;
create unique index if not exists notices_request_id_idx on public.notices(firm_id, request_id) where request_id is not null;
alter table public.tasks add column if not exists notice_id uuid references public.notices(id) on delete set null;
create unique index if not exists tasks_notice_id_idx on public.tasks(notice_id) where notice_id is not null;
create index if not exists notices_firm_deadline_idx on public.notices(firm_id, deadline);

-- Keep contact-scoped reads. Internal roles alone may write; all relations must be in the tenant.
drop policy if exists notices_scope on public.notices;
create policy notices_read_phase1 on public.notices for select to authenticated using (
  public.is_god_admin() or (firm_id = public.current_user_firm_id() and
  (public.current_user_role() in ('SuperAdmin','Admin','Staff') or exists (
    select 1 from public.client_contacts cc where cc.client_id = notices.client_id and cc.user_id = public.current_user_profile_id()))));
create policy notices_write_phase1 on public.notices for all to authenticated
using (public.is_god_admin() or (firm_id = public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff')))
with check ((public.is_god_admin() or (firm_id = public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff')))
  and exists (select 1 from public.clients c where c.id = notices.client_id and c.firm_id = notices.firm_id)
  and (assigned_to is null or exists (select 1 from public.users u where u.id = notices.assigned_to and u.firm_id = notices.firm_id and u.status='Active' and u.role in ('SuperAdmin','Admin','Staff'))));

create table public.notice_history (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id), notice_id uuid not null references public.notices(id) on delete cascade,
  actor_id uuid not null references public.users(id), event_type text not null,
  from_status text, to_status text, created_at timestamptz not null default now()
);
alter table public.notice_history enable row level security;
grant select, insert on public.notice_history to authenticated;
create policy notice_history_read on public.notice_history for select to authenticated using (
  firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff'));
create policy notice_history_insert on public.notice_history for insert to authenticated with check (
  firm_id=public.current_user_firm_id() and actor_id=public.current_user_profile_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff')
  and exists(select 1 from public.notices n where n.id=notice_id and n.firm_id=notice_history.firm_id));
create index notice_history_notice_idx on public.notice_history(notice_id, created_at);

create function public.create_notice_intelligence(p_client_id uuid, p_number text, p_source text, p_received date, p_deadline date, p_description text, p_assigned_to uuid, p_request_id uuid)
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
  return v_id;
end $$;
revoke all on function public.create_notice_intelligence(uuid,text,text,date,date,text,uuid,uuid) from public, anon;
grant execute on function public.create_notice_intelligence(uuid,text,text,date,date,text,uuid,uuid) to authenticated;

create function public.update_notice_intelligence(p_id uuid, p_version integer, p_status text, p_assigned_to uuid, p_draft text, p_filing_reference text)
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
  return n.version+1;
end $$;
revoke all on function public.update_notice_intelligence(uuid,integer,text,uuid,text,text) from public, anon;
grant execute on function public.update_notice_intelligence(uuid,integer,text,uuid,text,text) to authenticated;

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms(id),
  name text not null check(length(trim(name))>0), email text, phone text, source text, notes text,
  stage text not null default 'New' check(stage in ('New','Contacted','Qualified','Proposal','Won','Lost')),
  next_follow_up date, client_id uuid references public.clients(id),
  created_by uuid not null default public.current_user_profile_id() references public.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((stage='Won' and client_id is not null) or (stage<>'Won' and client_id is null))
);
alter table public.crm_leads enable row level security;
grant select,insert,update on public.crm_leads to authenticated;
create policy crm_leads_read on public.crm_leads for select to authenticated using (firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff'));
create policy crm_leads_insert on public.crm_leads for insert to authenticated with check (firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin') and created_by=public.current_user_profile_id() and stage='New' and client_id is null);
create policy crm_leads_update on public.crm_leads for update to authenticated using (firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin')) with check (firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin') and (client_id is null or exists(select 1 from public.clients c where c.id=crm_leads.client_id and c.firm_id=crm_leads.firm_id)));
create index crm_leads_followup_idx on public.crm_leads(firm_id,next_follow_up) where stage not in ('Won','Lost');
-- Link the existing Client Master record; do not create a parallel client registry.
create function public.convert_crm_lead(p_lead_id uuid, p_client_id uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare l public.crm_leads;
begin
  if public.current_user_role() not in ('SuperAdmin','Admin') or public.current_user_firm_id() is null then raise exception 'Manager access required'; end if;
  select * into l from public.crm_leads where id=p_lead_id and firm_id=public.current_user_firm_id() for update;
  if not found then raise exception 'Lead unavailable'; end if;
  if l.stage='Won' and l.client_id=p_client_id then return p_client_id; end if;
  if l.stage in ('Won','Lost') then raise exception 'Lead is already closed'; end if;
  if not exists(select 1 from public.clients where id=p_client_id and firm_id=l.firm_id) then raise exception 'Client is outside workspace'; end if;
  update public.crm_leads set stage='Won',client_id=p_client_id,next_follow_up=null,updated_at=now() where id=l.id;
  return p_client_id;
end $$;
revoke all on function public.convert_crm_lead(uuid,uuid) from public,anon;
grant execute on function public.convert_crm_lead(uuid,uuid) to authenticated;
commit;
