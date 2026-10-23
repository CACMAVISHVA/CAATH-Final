begin;
-- RLS scopes rows; this guard also enforces role boundaries on direct REST writes.
create function public.guard_notice_intelligence_write() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_role text := public.current_user_role(); v_allowed text[];
begin
  if auth.uid() is null then return new; end if;
  if tg_op='UPDATE' then
    if new.firm_id is distinct from old.firm_id or new.client_id is distinct from old.client_id or new.request_id is distinct from old.request_id or new.created_by is distinct from old.created_by then raise exception 'Notice identity cannot change'; end if;
    if old.status='Archived' then raise exception 'Archived notices are read-only'; end if;
    v_allowed := case old.status
      when 'Received' then array['Assigned','Escalated','Archived']
      when 'Assigned' then array['Drafting','Under_Review','Escalated','Reassigned','Archived']
      when 'Drafting' then array['Drafted','Under_Review','Escalated','Reassigned','Archived']
      when 'Drafted' then array['Under_Review','Filed','Escalated','Reassigned','Archived']
      when 'Under_Review' then array['Filed','Escalated','Reassigned','Archived']
      when 'Escalated' then array['Assigned','Drafting','Under_Review','Filed','Reassigned','Archived']
      when 'Reassigned' then array['Assigned','Drafting','Under_Review','Escalated','Archived']
      when 'Filed' then array['Closed','Archived'] when 'Closed' then array['Archived'] else array[]::text[] end;
    if new.status is distinct from old.status and not new.status=any(v_allowed) then raise exception 'Invalid notice transition'; end if;
    if v_role='Staff' and (new.assigned_to is distinct from old.assigned_to or new.filing_reference is distinct from old.filing_reference or new.status in ('Filed','Closed','Archived')) then raise exception 'Manager review required'; end if;
    new.version := old.version+1;
  else
    if new.status not in ('Received','Assigned') then raise exception 'New notice must be received or assigned'; end if;
    if v_role='Staff' and new.assigned_to is not null then raise exception 'Staff cannot delegate ownership'; end if;
  end if;
  if v_role='Admin' and new.assigned_to is not null and (tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to) and not exists(select 1 from public.users where id=new.assigned_to and firm_id=new.firm_id and role='Staff' and status='Active') then raise exception 'Admin can assign only to staff'; end if;
  if new.status in ('Assigned','Reassigned') and new.assigned_to is null then raise exception 'Choose an owner'; end if;
  if new.status in ('Drafted','Under_Review') and nullif(trim(new.reply_draft),'') is null then raise exception 'A reply draft is required'; end if;
  if new.status='Filed' and nullif(trim(new.filing_reference),'') is null then raise exception 'Record the manual filing acknowledgement'; end if;
  if nullif(trim(new.notice_number),'') is null or new.deadline<new.received_date then raise exception 'Invalid notice input'; end if;
  new.updated_by := public.current_user_profile_id(); new.updated_at := now();
  return new;
end $$;
revoke all on function public.guard_notice_intelligence_write() from public,anon,authenticated;
create trigger notice_intelligence_guard before insert or update on public.notices for each row execute function public.guard_notice_intelligence_write();

create function public.guard_crm_lead_write() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.firm_id is distinct from old.firm_id or new.created_by is distinct from old.created_by then raise exception 'Lead identity cannot change'; end if;
  if old.stage in ('Won','Lost') and new is distinct from old then raise exception 'Closed leads are read-only'; end if;
  new.updated_at := now(); return new;
end $$;
revoke all on function public.guard_crm_lead_write() from public,anon,authenticated;
create trigger crm_lead_guard before update on public.crm_leads for each row execute function public.guard_crm_lead_write();
commit;
