begin;
create table public.notice_ai_requests (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms(id),
 notice_id uuid not null references public.notices(id), actor_id uuid not null references public.users(id),
 created_at timestamptz not null default now()
);
alter table public.notice_ai_requests enable row level security;
revoke all on public.notice_ai_requests from anon,authenticated;
grant select on public.notice_ai_requests to authenticated;
create policy notice_ai_requests_read on public.notice_ai_requests for select to authenticated using (
 firm_id=public.current_user_firm_id() and (actor_id=public.current_user_profile_id() or public.current_user_role() in ('Admin','SuperAdmin'))
);
create index notice_ai_actor_time on public.notice_ai_requests(actor_id,created_at);
create schema notice_ai_private;
revoke all on schema notice_ai_private from public,anon,authenticated;
create function notice_ai_private.reserve(p_notice uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; result uuid;
begin
 select * into actor from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null;
 if actor.id is null or actor.firm_id is null or actor.role not in ('Admin','SuperAdmin','Staff') then raise exception 'Internal active workspace required'; end if;
 if not exists(select 1 from public.notices where id=p_notice and firm_id=actor.firm_id and status<>'Archived') then raise exception 'Notice unavailable'; end if;
 if not public.is_subscription_active() then raise exception 'Active subscription required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor.id::text,48));
 if (select count(*) from public.notice_ai_requests where actor_id=actor.id and created_at>now()-interval '1 hour')>=5 or
    (select count(*) from public.notice_ai_requests where actor_id=actor.id and created_at>now()-interval '1 day')>=20 then raise exception 'AI draft limit reached'; end if;
 insert into public.notice_ai_requests(firm_id,notice_id,actor_id) values(actor.firm_id,p_notice,actor.id) returning id into result;
 return result;
end $$;
revoke all on function notice_ai_private.reserve(uuid) from public,anon;
grant usage on schema notice_ai_private to authenticated;
grant execute on function notice_ai_private.reserve(uuid) to authenticated;
create function public.reserve_notice_ai_request(p_notice uuid) returns uuid language sql security invoker set search_path='' as $$select notice_ai_private.reserve(p_notice)$$;
revoke all on function public.reserve_notice_ai_request(uuid) from public,anon;
grant execute on function public.reserve_notice_ai_request(uuid) to authenticated;
commit;
