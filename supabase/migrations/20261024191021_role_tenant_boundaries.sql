begin;
-- Soft-deleted profiles must not retain permissions through an unexpired session.
create or replace function public.current_user_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1
$$;
create or replace function public.current_user_profile_id() returns uuid language sql stable security definer set search_path='' as $$
 select id from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1
$$;
create or replace function public.current_user_firm_id() returns uuid language sql stable security definer set search_path='' as $$
 select u.firm_id from public.users u left join public.firms f on f.id=u.firm_id
 where u.auth_id=auth.uid() and u.status='Active' and u.deleted_at is null and
 (u.role='GodAdmin' or f.status='Active' or (f.status='Suspended' and f.suspension_mode='Grace Period' and f.suspension_effective_at>now())) limit 1
$$;
create schema role_boundary_private;
revoke all on schema role_boundary_private from public,anon,authenticated;
-- Trigger-only validator: private schema, fixed references, no data returned to callers.
create function role_boundary_private.guard_user_hierarchy() returns trigger language plpgsql security definer set search_path='' as $$
declare r text:=public.current_user_role();
begin
 if auth.uid() is null or r='GodAdmin' then return new; end if;
 if new.role='GodAdmin' then raise exception 'Platform role requires platform administration'; end if;
 if tg_op='UPDATE' then
  if new.auth_id is distinct from old.auth_id or new.firm_id is distinct from old.firm_id then raise exception 'User identity cannot be reassigned'; end if;
  if r='Admin' and (old.role not in ('Staff','Client') or old.is_workspace_owner or new.is_workspace_owner) then raise exception 'Admin cannot change a manager or workspace owner'; end if;
 end if;
 return new;
end $$;
revoke all on function role_boundary_private.guard_user_hierarchy() from public,anon,authenticated;
create trigger user_hierarchy_boundary before insert or update on public.users for each row execute function role_boundary_private.guard_user_hierarchy();

create function role_boundary_private.guard_relations() returns trigger language plpgsql security definer set search_path='' as $$
declare v jsonb:=to_jsonb(new); f uuid:=(v->>'firm_id')::uuid; c uuid:=(v->>'client_id')::uuid; u uuid;
begin
 if c is not null and not exists(select 1 from public.clients where id=c and firm_id=f) then raise exception 'Client is outside record workspace'; end if;
 if tg_table_name='client_contacts' then
  u:=(v->>'user_id')::uuid;
  if not exists(select 1 from public.users where id=u and firm_id=f) then raise exception 'Contact is outside record workspace'; end if;
 end if;
 if v->>'assigned_to' is not null then
  u:=(v->>'assigned_to')::uuid;
  if not exists(select 1 from public.users where id=u and firm_id=f and role in ('SuperAdmin','Admin','Staff')) then raise exception 'Assignee is outside record workspace'; end if;
 end if;
 if tg_table_name in ('gst_return_statuses','gst_client_authorizations') and not exists(select 1 from public.clients where id=c and firm_id=f and gstin=v->>'gstin') then raise exception 'GSTIN does not match client'; end if;
 return new;
end $$;
revoke all on function role_boundary_private.guard_relations() from public,anon,authenticated;
create trigger task_relation_boundary before insert or update on public.tasks for each row execute function role_boundary_private.guard_relations();
create trigger document_relation_boundary before insert or update on public.documents for each row execute function role_boundary_private.guard_relations();
create trigger vault_relation_boundary before insert or update on public.document_vault for each row execute function role_boundary_private.guard_relations();
create trigger contact_relation_boundary before insert or update on public.client_contacts for each row execute function role_boundary_private.guard_relations();
create trigger compliance_relation_boundary before insert or update on public.compliance_tasks for each row execute function role_boundary_private.guard_relations();
create trigger gst_status_relation_boundary before insert or update on public.gst_return_statuses for each row execute function role_boundary_private.guard_relations();
create trigger gst_profile_relation_boundary before insert or update on public.gst_client_return_profiles for each row execute function role_boundary_private.guard_relations();
create trigger gst_authorization_relation_boundary before insert or update on public.gst_client_authorizations for each row execute function role_boundary_private.guard_relations();

-- Client portal reads only records explicitly linked to that profile.
drop policy gst_return_statuses_read on public.gst_return_statuses;
create policy gst_return_statuses_read on public.gst_return_statuses for select to authenticated using (
 firm_id=public.current_user_firm_id() and (public.current_user_role() in ('SuperAdmin','Admin','Staff') or exists(select 1 from public.client_contacts cc where cc.firm_id=gst_return_statuses.firm_id and cc.client_id=gst_return_statuses.client_id and cc.user_id=public.current_user_profile_id())));
drop policy gst_client_return_profiles_read on public.gst_client_return_profiles;
create policy gst_client_return_profiles_read on public.gst_client_return_profiles for select to authenticated using (
 firm_id=public.current_user_firm_id() and (public.current_user_role() in ('SuperAdmin','Admin','Staff') or exists(select 1 from public.client_contacts cc where cc.firm_id=gst_client_return_profiles.firm_id and cc.client_id=gst_client_return_profiles.client_id and cc.user_id=public.current_user_profile_id())));
drop policy gst_client_authorizations_read on public.gst_client_authorizations;
create policy gst_client_authorizations_read on public.gst_client_authorizations for select to authenticated using (
 firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff'));

-- A targeted alert must not become a broadcast just because audience_role is null.
drop policy notifications_scope on public.notifications;
create policy notifications_read_boundary on public.notifications for select to authenticated using (
 public.is_god_admin() or (public.current_user_firm_id() is not null and (firm_id is null or firm_id=public.current_user_firm_id()) and
 (recipient_user_id=public.current_user_profile_id() or (recipient_user_id is null and (audience_role is null or audience_role=public.current_user_role() or (public.current_user_role()='SuperAdmin' and audience_role='Admin'))))));
create policy notifications_insert_boundary on public.notifications for insert to authenticated with check (
 public.is_god_admin() or (firm_id=public.current_user_firm_id() and (public.current_user_role() in ('SuperAdmin','Admin','Staff') or (public.current_user_role()='Client' and audience_role in ('Admin','SuperAdmin')))));
create policy notifications_update_boundary on public.notifications for update to authenticated using (
 public.is_god_admin() or (public.current_user_firm_id() is not null and (firm_id is null or firm_id=public.current_user_firm_id()) and
 (recipient_user_id=public.current_user_profile_id() or (recipient_user_id is null and (audience_role is null or audience_role=public.current_user_role() or (public.current_user_role()='SuperAdmin' and audience_role='Admin'))))))
 with check (public.is_god_admin() or (public.current_user_firm_id() is not null and (firm_id is null or firm_id=public.current_user_firm_id())));
create policy notifications_delete_boundary on public.notifications for delete to authenticated using (public.is_god_admin());
create function role_boundary_private.guard_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare r text:=public.current_user_role(); target public.users;
begin
 if auth.uid() is null then return new; end if;
 if tg_op='UPDATE' then
  if not public.is_god_admin() and (to_jsonb(new)-array['status','updated_by','updated_at']) is distinct from (to_jsonb(old)-array['status','updated_by','updated_at']) then raise exception 'Only notification read state may change'; end if;
 else
  if new.recipient_user_id is not null then
   select * into target from public.users where id=new.recipient_user_id;
   if target.id is null or (target.firm_id is distinct from new.firm_id and target.role<>'GodAdmin') then raise exception 'Recipient is outside notification workspace'; end if;
   if r='Client' and target.role not in ('Admin','SuperAdmin') then raise exception 'Client alerts require a manager recipient'; end if;
  end if;
  new.created_by:=public.current_user_profile_id();
 end if;
 new.updated_by:=public.current_user_profile_id();
 return new;
end $$;
revoke all on function role_boundary_private.guard_notification() from public,anon,authenticated;
create trigger notification_content_boundary before insert or update on public.notifications for each row execute function role_boundary_private.guard_notification();
-- Browser-generated audit entries cannot impersonate another profile or server vault events.
create function role_boundary_private.guard_audit_identity() returns trigger language plpgsql security definer set search_path='' as $$
declare actor public.users;
begin
 if auth.uid() is null then return new; end if;
 select * into actor from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null;
 if actor.id is null then raise exception 'Active audit actor required'; end if;
 if new.entity_type='portal_credentials' or new.action like 'portal_credential_%' or new.action='portal_action_requested' then raise exception 'Vault audit events require the secure service'; end if;
 new.user_id:=actor.id; new.user_name:=actor.name; new.user_role:=actor.role;
 new.ip_address:=null;
 return new;
end $$;
revoke all on function role_boundary_private.guard_audit_identity() from public,anon,authenticated;
create trigger audit_actor_boundary before insert on public.audit_logs for each row execute function role_boundary_private.guard_audit_identity();
commit;
