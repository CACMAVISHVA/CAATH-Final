-- Centralised error monitoring for GodAdmin.
-- Additive only: new tables, a private helper schema and RPCs. No existing object is changed.
--
-- Model
--   error_groups        one row per error fingerprint (deduplicated issue)
--   error_occurrences   daily roll-up per (group, firm, user): bounded writes, feeds trends
--   error_group_events  investigation history (notes, status, assignment, escalation)
--   error_alerts        alert history (in-app / email), deduplicated per group
--   error_alert_settings singleton channel configuration
--   error_report_rate   per-session rate limiting for the reporting RPC
--
-- Access
--   Browsers never write these tables directly. report_errors() derives the reporter's
--   identity from auth.uid(), re-validates and re-redacts every field, and rate-limits.
--   Only GodAdmin can read the tables. Firm SuperAdmin/Admin get a stack-free summary of
--   their own firm through firm_error_summary().
begin;

create schema if not exists error_monitor_private;
revoke all on schema error_monitor_private from public, anon, authenticated;

create table public.error_groups (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  error_type text not null check (error_type in ('frontend','react','api','database','auth','storage','network','performance','job','integration','validation','unknown')),
  module text not null default 'unknown',
  severity text not null check (severity in ('Critical','High','Medium','Low')),
  base_severity text not null check (base_severity in ('Critical','High','Medium','Low')),
  message text not null,
  error_code text,
  stack text,
  environment text not null default 'production' check (environment in ('production','staging','development')),
  status text not null default 'New' check (status in ('New','Investigating','Resolved','Ignored')),
  assigned_to uuid references public.users(id) on delete set null,
  occurrence_count bigint not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_request_id text,
  last_browser text,
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  last_alerted_at timestamptz,
  last_alert_severity text
);
create index error_groups_status_seen_idx on public.error_groups (status, last_seen_at desc);
create index error_groups_last_seen_idx on public.error_groups (last_seen_at desc);

create table public.error_occurrences (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.error_groups(id) on delete cascade,
  firm_id uuid references public.firms(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  day date not null,
  count integer not null default 1 check (count > 0),
  route text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create unique index error_occurrences_rollup_idx on public.error_occurrences
  (group_id, (coalesce(firm_id, '00000000-0000-0000-0000-000000000000'::uuid)), (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid)), day);
create index error_occurrences_day_idx on public.error_occurrences (day, group_id);
create index error_occurrences_firm_idx on public.error_occurrences (firm_id, day);

create table public.error_group_events (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.error_groups(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  kind text not null check (kind in ('note','status','assignment','severity','regression')),
  from_value text,
  to_value text,
  note text check (note is null or char_length(note) <= 4000),
  created_at timestamptz not null default now()
);
create index error_group_events_group_idx on public.error_group_events (group_id, created_at desc);

create table public.error_alerts (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.error_groups(id) on delete cascade,
  severity text not null,
  channel text not null check (channel in ('in_app','email')),
  delivery_status text not null check (delivery_status in ('sent','pending','failed')),
  reason text not null check (reason in ('new','escalated','recurring','regression')),
  created_at timestamptz not null default now()
);
create index error_alerts_created_idx on public.error_alerts (created_at desc);

create table public.error_alert_settings (
  id boolean primary key default true check (id),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  email_recipients text[] not null default '{}' check (coalesce(array_length(email_recipients, 1), 0) <= 10),
  realert_hours integer not null default 6 check (realert_hours between 1 and 168),
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.error_alert_settings (id) values (true);

create table public.error_report_rate (
  auth_id uuid primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

alter table public.error_groups enable row level security;
alter table public.error_occurrences enable row level security;
alter table public.error_group_events enable row level security;
alter table public.error_alerts enable row level security;
alter table public.error_alert_settings enable row level security;
alter table public.error_report_rate enable row level security;

revoke all on public.error_groups, public.error_occurrences, public.error_group_events, public.error_alerts,
  public.error_alert_settings, public.error_report_rate from public, anon, authenticated;
grant select on public.error_groups, public.error_occurrences, public.error_group_events, public.error_alerts,
  public.error_alert_settings to authenticated;
grant update (in_app_enabled, email_enabled, email_recipients, realert_hours, updated_by, updated_at)
  on public.error_alert_settings to authenticated;

create policy error_groups_god_read on public.error_groups for select to authenticated using (public.is_god_admin());
create policy error_occurrences_god_read on public.error_occurrences for select to authenticated using (public.is_god_admin());
create policy error_group_events_god_read on public.error_group_events for select to authenticated using (public.is_god_admin());
create policy error_alerts_god_read on public.error_alerts for select to authenticated using (public.is_god_admin());
create policy error_alert_settings_god_read on public.error_alert_settings for select to authenticated using (public.is_god_admin());
create policy error_alert_settings_god_update on public.error_alert_settings for update to authenticated
  using (public.is_god_admin()) with check (public.is_god_admin());
-- error_report_rate: no policy on purpose; only the SECURITY DEFINER RPC touches it.

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------
create function error_monitor_private.redact(t text) returns text language sql immutable set search_path = '' as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    coalesce(t, ''),
    'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}', '[redacted-token]', 'g'),
    '(sb_secret|sb_publishable|sk_live|sk_test|rzp_live|rzp_test)_[A-Za-z0-9_-]{6,}', '[redacted-key]', 'g'),
    '(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}', '\1 [redacted]', 'gi'),
    '(password|passwd|pwd|secret|token|api[_-]?key|apikey|authorization|otp|pin|cvv)("?\s*[=:]\s*"?)[^\s"&,;}]+', '\1\2[redacted]', 'gi'),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[redacted-email]', 'g'),
    '\m[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\M|\m[A-Z]{5}[0-9]{4}[A-Z]\M', '[redacted-tax-id]', 'g'),
    '\m[0-9]{9,}\M', '[redacted-number]', 'g')
$$;

create function error_monitor_private.normalise(t text) returns text language sql immutable set search_path = '' as $$
  select left(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(t, '')),
    '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', 'g'),
    '-[a-z0-9_]{8}\.(js|css)', '.\1', 'g'),
    '[0-9]+', '#', 'g'), 300)
$$;

create function error_monitor_private.severity_rank(s text) returns integer language sql immutable set search_path = '' as $$
  select case s when 'Critical' then 4 when 'High' then 3 when 'Medium' then 2 else 1 end
$$;

create function error_monitor_private.severity_name(r integer) returns text language sql immutable set search_path = '' as $$
  select case when r >= 4 then 'Critical' when r = 3 then 'High' when r = 2 then 'Medium' else 'Low' end
$$;

create function error_monitor_private.today() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

-- Retention: 90 days of occurrence roll-ups, 180 days for closed issues and alert history.
create function error_monitor_private.purge() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.error_occurrences where day < error_monitor_private.today() - 90;
  delete from public.error_groups where status in ('Resolved', 'Ignored') and last_seen_at < now() - interval '180 days';
  delete from public.error_alerts where created_at < now() - interval '180 days';
  delete from public.error_report_rate where window_start < now() - interval '1 day';
end $$;

revoke all on all functions in schema error_monitor_private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reporting endpoint (any signed-in user; identity is never taken from the payload)
-- ---------------------------------------------------------------------------
create function public.report_errors(p_events jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile uuid; v_firm uuid;
  v_n integer; v_rate integer;
  ev jsonb; g public.error_groups; s public.error_alert_settings;
  v_type text; v_module text; v_sev text; v_msg text; v_stack text; v_code text; v_env text;
  v_count integer; v_fp text; v_inserted boolean; v_recent bigint; v_rank integer; v_new_sev text;
  v_reason text; v_accepted integer := 0; v_refs jsonb := '[]'::jsonb; v_delivery text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' then raise exception 'Invalid error report' using errcode = '22023'; end if;
  v_n := least(jsonb_array_length(p_events), 20);
  if v_n = 0 then return jsonb_build_object('accepted', 0); end if;

  insert into public.error_report_rate as r (auth_id, window_start, count) values (v_uid, now(), v_n)
  on conflict (auth_id) do update set
    window_start = case when r.window_start < now() - interval '10 minutes' then now() else r.window_start end,
    count = case when r.window_start < now() - interval '10 minutes' then excluded.count else r.count + excluded.count end
  returning count into v_rate;
  if v_rate > 60 then return jsonb_build_object('accepted', 0, 'rate_limited', true); end if;

  select u.id, u.firm_id into v_profile, v_firm from public.users u where u.auth_id = v_uid and u.deleted_at is null limit 1;
  select * into s from public.error_alert_settings where id;

  for ev in select value from jsonb_array_elements(p_events) limit 20 loop
    if jsonb_typeof(ev) <> 'object' then continue; end if;
    v_type := lower(coalesce(ev->>'type', 'unknown'));
    if v_type not in ('frontend','react','api','database','auth','storage','network','performance','job','integration','validation') then v_type := 'unknown'; end if;
    v_module := left(regexp_replace(lower(coalesce(ev->>'module', '')), '[^a-z0-9_-]', '', 'g'), 60);
    if v_module = '' then v_module := 'unknown'; end if;
    v_sev := initcap(lower(coalesce(ev->>'severity', 'Medium')));
    if v_sev not in ('Critical','High','Medium','Low') then v_sev := 'Medium'; end if;
    v_msg := left(error_monitor_private.redact(left(coalesce(nullif(btrim(ev->>'message'), ''), 'Unknown error'), 2000)), 500);
    v_stack := nullif(left(error_monitor_private.redact(left(ev->>'stack', 12000)), 6000), '');
    v_code := nullif(left(regexp_replace(coalesce(ev->>'code', ''), '[^A-Za-z0-9_.:-]', '', 'g'), 60), '');
    v_env := lower(coalesce(ev->>'environment', 'production'));
    if v_env not in ('production','staging','development') then v_env := 'production'; end if;
    v_count := case when ev->>'count' ~ '^[0-9]{1,4}$' then least(greatest((ev->>'count')::integer, 1), 500) else 1 end;
    v_fp := md5(v_type || '|' || v_module || '|' || coalesce(v_code, '') || '|' || error_monitor_private.normalise(v_msg)
      || '|' || error_monitor_private.normalise(left(coalesce(ev->>'frame', ''), 300)));

    insert into public.error_groups as eg (fingerprint, error_type, module, severity, base_severity, message, error_code, stack,
      environment, occurrence_count, last_request_id, last_browser)
    values (v_fp, v_type, v_module, v_sev, v_sev, v_msg, v_code, v_stack, v_env, v_count,
      nullif(left(regexp_replace(coalesce(ev->>'request_id', ''), '[^A-Za-z0-9_.:-]', '', 'g'), 80), ''),
      nullif(left(regexp_replace(coalesce(ev->>'browser', ''), '[^A-Za-z0-9 ._/()-]', '', 'g'), 120), ''))
    on conflict (fingerprint) do update set
      occurrence_count = eg.occurrence_count + excluded.occurrence_count,
      last_seen_at = now(),
      stack = coalesce(eg.stack, excluded.stack),
      last_request_id = coalesce(excluded.last_request_id, eg.last_request_id),
      last_browser = coalesce(excluded.last_browser, eg.last_browser)
    returning (xmax = 0) into v_inserted;
    select * into g from public.error_groups where fingerprint = v_fp;

    insert into public.error_occurrences as o (group_id, firm_id, user_id, day, count, route)
    values (g.id, v_firm, v_profile, error_monitor_private.today(), v_count,
      nullif(left(regexp_replace(coalesce(ev->>'route', ''), '[?#].*$', ''), 120), ''))
    on conflict (group_id, (coalesce(firm_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid)), day)
    do update set count = o.count + excluded.count, last_seen_at = now(), route = coalesce(excluded.route, o.route);

    v_reason := case when v_inserted then 'new' else null end;

    -- A resolved issue that comes back is reopened so it cannot be silently lost.
    if g.status = 'Resolved' then
      update public.error_groups set status = 'New', resolved_at = null, resolved_by = null where id = g.id;
      insert into public.error_group_events (group_id, kind, from_value, to_value, note)
      values (g.id, 'regression', 'Resolved', 'New', 'Reopened automatically: the error occurred again after it was resolved.');
      g.status := 'New'; v_reason := 'regression';
    end if;

    -- Repetition raises priority: 10+ in two days is one level up, 50+ is two levels up.
    select coalesce(sum(count), 0) into v_recent from public.error_occurrences
      where group_id = g.id and day >= error_monitor_private.today() - 1;
    v_rank := least(4, error_monitor_private.severity_rank(g.base_severity)
      + case when v_recent >= 50 then 2 when v_recent >= 10 then 1 else 0 end);
    if v_rank > error_monitor_private.severity_rank(g.severity) then
      v_new_sev := error_monitor_private.severity_name(v_rank);
      update public.error_groups set severity = v_new_sev where id = g.id;
      insert into public.error_group_events (group_id, kind, from_value, to_value, note)
      values (g.id, 'severity', g.severity, v_new_sev, 'Escalated automatically after ' || v_recent || ' occurrences in two days.');
      g.severity := v_new_sev; v_reason := coalesce(v_reason, 'escalated');
    end if;

    -- Alert once per issue; again only when it escalates, regresses, or keeps recurring past the re-alert window.
    if g.status <> 'Ignored' and g.severity in ('Critical', 'High') and (
      g.last_alerted_at is null
      or v_reason = 'regression'
      or error_monitor_private.severity_rank(g.severity) > error_monitor_private.severity_rank(coalesce(g.last_alert_severity, 'Low'))
      or g.last_alerted_at < now() - make_interval(hours => s.realert_hours)
    ) then
      v_reason := coalesce(v_reason, 'recurring');
      if s.in_app_enabled then
        v_delivery := 'sent';
        begin
          insert into public.notifications (firm_id, audience_role, title, message, status, priority)
          values (null, 'GodAdmin',
            case g.severity when 'Critical' then 'Critical error: ' else 'High-severity error: ' end || g.module,
            left(g.message, 180) || ' [ERROR_GROUP:' || g.id || ']', 'UNREAD', upper(g.severity));
        exception when others then v_delivery := 'failed';
        end;
        insert into public.error_alerts (group_id, severity, channel, delivery_status, reason) values (g.id, g.severity, 'in_app', v_delivery, v_reason);
      end if;
      if s.email_enabled and coalesce(array_length(s.email_recipients, 1), 0) > 0 then
        -- Queued for an email sender; no mail provider is wired to this table yet.
        insert into public.error_alerts (group_id, severity, channel, delivery_status, reason) values (g.id, g.severity, 'email', 'pending', v_reason);
      end if;
      update public.error_groups set last_alerted_at = now(), last_alert_severity = g.severity where id = g.id;
    end if;

    v_accepted := v_accepted + 1;
    v_refs := v_refs || to_jsonb('ERR-' || upper(left(replace(g.id::text, '-', ''), 8)));
  end loop;

  if random() < 0.02 then perform error_monitor_private.purge(); end if;
  return jsonb_build_object('accepted', v_accepted, 'references', v_refs);
end $$;

-- ---------------------------------------------------------------------------
-- GodAdmin: dashboard, list, detail, workflow
-- ---------------------------------------------------------------------------
create function error_monitor_private.require_god_admin() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce(public.is_god_admin(), false) then raise exception 'Platform administration required' using errcode = '42501'; end if;
end $$;
revoke all on function error_monitor_private.require_god_admin() from public, anon, authenticated;

create function public.error_monitor_stats(
  p_from date default null, p_to date default null, p_firm uuid default null, p_module text default null,
  p_severity text default null, p_type text default null, p_status text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_from date := coalesce(p_from, error_monitor_private.today() - 29); v_to date := coalesce(p_to, error_monitor_private.today()); result jsonb;
begin
  perform error_monitor_private.require_god_admin();
  with occ as (
    select o.group_id, o.firm_id, o.user_id, o.day, o.count, g.severity, g.status, g.module, g.error_type, g.message
    from public.error_occurrences o join public.error_groups g on g.id = o.group_id
    where (p_firm is null or o.firm_id = p_firm) and (p_module is null or g.module = p_module)
      and (p_severity is null or g.severity = p_severity) and (p_type is null or g.error_type = p_type)
      and (p_status is null or g.status = p_status)
  ), ranged as (select * from occ where day between v_from and v_to)
  select jsonb_build_object(
    'from', v_from, 'to', v_to,
    'total_errors', (select coalesce(sum(count), 0) from ranged),
    'issues', (select count(distinct group_id) from ranged),
    'critical_errors', (select coalesce(sum(count), 0) from ranged where severity = 'Critical'),
    'unresolved_issues', (select count(distinct group_id) from ranged where status in ('New', 'Investigating')),
    'errors_today', (select coalesce(sum(count), 0) from occ where day = error_monitor_private.today()),
    'affected_firms', (select count(distinct firm_id) from ranged where firm_id is not null),
    'by_firm', coalesce((select jsonb_agg(x) from (
        select r.firm_id, coalesce(f.name, 'Platform / no workspace') as firm_name, sum(r.count) as errors, count(distinct r.group_id) as issues
        from ranged r left join public.firms f on f.id = r.firm_id group by r.firm_id, f.name order by sum(r.count) desc limit 10) x), '[]'::jsonb),
    'by_module', coalesce((select jsonb_agg(x) from (
        select module, sum(count) as errors, count(distinct group_id) as issues from ranged group by module order by sum(count) desc limit 12) x), '[]'::jsonb),
    'by_type', coalesce((select jsonb_agg(x) from (
        select error_type, sum(count) as errors from ranged group by error_type order by sum(count) desc) x), '[]'::jsonb),
    'top_issues', coalesce((select jsonb_agg(x) from (
        select group_id, message, module, severity, status, sum(count) as errors from ranged
        group by group_id, message, module, severity, status order by sum(count) desc limit 5) x), '[]'::jsonb),
    'trend', coalesce((select jsonb_agg(x order by x.day) from (
        select day, sum(count) as errors, coalesce(sum(count) filter (where severity = 'Critical'), 0) as critical
        from ranged group by day) x), '[]'::jsonb),
    'modules', coalesce((select jsonb_agg(distinct module) from public.error_groups), '[]'::jsonb)
  ) into result;
  return result;
end $$;

create function public.error_monitor_list(
  p_from date default null, p_to date default null, p_firm uuid default null, p_module text default null,
  p_severity text default null, p_type text default null, p_status text default null, p_search text default null,
  p_limit integer default 25, p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_from date := coalesce(p_from, error_monitor_private.today() - 29); v_to date := coalesce(p_to, error_monitor_private.today()); result jsonb;
begin
  perform error_monitor_private.require_god_admin();
  with matched as (
    select g.id, g.error_type, g.module, g.severity, g.status, g.message, g.error_code, g.environment, g.assigned_to,
      g.occurrence_count, g.first_seen_at, g.last_seen_at,
      sum(o.count) as errors_in_range, count(distinct o.firm_id) as affected_firms, count(distinct o.user_id) as affected_users
    from public.error_groups g join public.error_occurrences o on o.group_id = g.id
    where o.day between v_from and v_to
      and (p_firm is null or o.firm_id = p_firm) and (p_module is null or g.module = p_module)
      and (p_severity is null or g.severity = p_severity) and (p_type is null or g.error_type = p_type)
      and (p_status is null or g.status = p_status)
      and (p_search is null or btrim(p_search) = '' or g.message ilike '%' || replace(replace(btrim(p_search), '%', '\%'), '_', '\_') || '%'
        or g.error_code ilike btrim(p_search) || '%'
        or ('ERR-' || upper(left(replace(g.id::text, '-', ''), 8))) = upper(btrim(p_search)))
    group by g.id
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'rows', coalesce((select jsonb_agg(x) from (
      select m.*, u.name as assignee_name from matched m left join public.users u on u.id = m.assigned_to
      order by error_monitor_private.severity_rank(m.severity) desc, m.last_seen_at desc
      limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0)) x), '[]'::jsonb)
  ) into result;
  return result;
end $$;

create function public.error_group_detail(p_group uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform error_monitor_private.require_god_admin();
  select jsonb_build_object(
    'group', to_jsonb(g) || jsonb_build_object('assignee_name', (select name from public.users where id = g.assigned_to)),
    'affected_users', (select count(distinct user_id) from public.error_occurrences where group_id = g.id),
    'firms', coalesce((select jsonb_agg(x) from (
        select o.firm_id, coalesce(f.name, 'Platform / no workspace') as firm_name, sum(o.count) as errors,
          count(distinct o.user_id) as users, max(o.last_seen_at) as last_seen_at
        from public.error_occurrences o left join public.firms f on f.id = o.firm_id
        where o.group_id = g.id group by o.firm_id, f.name order by sum(o.count) desc limit 50) x), '[]'::jsonb),
    'routes', coalesce((select jsonb_agg(distinct route) from public.error_occurrences where group_id = g.id and route is not null), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x order by x.day) from (
        select day, sum(count) as errors from public.error_occurrences where group_id = g.id group by day) x), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(x) from (
        select e.id, e.kind, e.from_value, e.to_value, e.note, e.created_at, coalesce(u.name, 'System') as actor_name
        from public.error_group_events e left join public.users u on u.id = e.actor_id
        where e.group_id = g.id order by e.created_at desc, e.id desc limit 200) x), '[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(x) from (
        select id, severity, channel, delivery_status, reason, created_at from public.error_alerts
        where group_id = g.id order by created_at desc limit 50) x), '[]'::jsonb),
    'assignees', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name)) from public.users u
        where u.role = 'GodAdmin' and u.status = 'Active' and u.deleted_at is null), '[]'::jsonb)
  ) into result from public.error_groups g where g.id = p_group;
  if result is null then raise exception 'Error report not found' using errcode = 'P0002'; end if;
  return result;
end $$;

create function public.error_group_update(
  p_group uuid, p_status text default null, p_assignee uuid default null, p_clear_assignee boolean default false,
  p_severity text default null, p_note text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare g public.error_groups; v_actor uuid := public.current_user_profile_id(); v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform error_monitor_private.require_god_admin();
  select * into g from public.error_groups where id = p_group for update;
  if g.id is null then raise exception 'Error report not found' using errcode = 'P0002'; end if;
  if v_note is not null and char_length(v_note) > 4000 then raise exception 'Note is too long' using errcode = '22001'; end if;

  if p_status is not null and p_status <> g.status then
    if p_status not in ('New','Investigating','Resolved','Ignored') then raise exception 'Invalid status' using errcode = '22023'; end if;
    update public.error_groups set status = p_status,
      resolved_at = case when p_status = 'Resolved' then now() else null end,
      resolved_by = case when p_status = 'Resolved' then v_actor else null end
    where id = g.id;
    insert into public.error_group_events (group_id, actor_id, kind, from_value, to_value) values (g.id, v_actor, 'status', g.status, p_status);
  end if;

  if p_clear_assignee and g.assigned_to is not null then
    update public.error_groups set assigned_to = null where id = g.id;
    insert into public.error_group_events (group_id, actor_id, kind, from_value, to_value)
    values (g.id, v_actor, 'assignment', (select name from public.users where id = g.assigned_to), 'Unassigned');
  elsif p_assignee is not null and p_assignee is distinct from g.assigned_to then
    if not exists (select 1 from public.users where id = p_assignee and role = 'GodAdmin' and status = 'Active' and deleted_at is null) then
      raise exception 'Assignee must be an active platform administrator' using errcode = '22023';
    end if;
    update public.error_groups set assigned_to = p_assignee where id = g.id;
    insert into public.error_group_events (group_id, actor_id, kind, from_value, to_value)
    values (g.id, v_actor, 'assignment', coalesce((select name from public.users where id = g.assigned_to), 'Unassigned'),
      (select name from public.users where id = p_assignee));
  end if;

  if p_severity is not null and p_severity <> g.severity then
    if p_severity not in ('Critical','High','Medium','Low') then raise exception 'Invalid severity' using errcode = '22023'; end if;
    update public.error_groups set severity = p_severity, base_severity = p_severity where id = g.id;
    insert into public.error_group_events (group_id, actor_id, kind, from_value, to_value) values (g.id, v_actor, 'severity', g.severity, p_severity);
  end if;

  if v_note is not null then
    insert into public.error_group_events (group_id, actor_id, kind, note) values (g.id, v_actor, 'note', v_note);
  end if;
  return public.error_group_detail(p_group);
end $$;

-- ---------------------------------------------------------------------------
-- Firm administrators: own-firm summary only, never stack traces or other tenants
-- ---------------------------------------------------------------------------
create function public.firm_error_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_firm uuid := public.current_user_firm_id(); result jsonb;
begin
  if v_firm is null or coalesce(public.current_user_role(), '') not in ('SuperAdmin', 'Admin') then
    raise exception 'Workspace administration required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into result from (
    select 'ERR-' || upper(left(replace(g.id::text, '-', ''), 8)) as reference, g.module, g.error_type, g.severity, g.status,
      left(g.message, 160) as message, sum(o.count) as occurrences, max(o.last_seen_at) as last_seen_at
    from public.error_occurrences o join public.error_groups g on g.id = o.group_id
    where o.firm_id = v_firm and o.day >= error_monitor_private.today() - 29 and g.status <> 'Ignored'
    group by g.id order by max(o.last_seen_at) desc limit 25) x;
  return result;
end $$;

revoke all on function public.report_errors(jsonb), public.error_monitor_stats(date, date, uuid, text, text, text, text),
  public.error_monitor_list(date, date, uuid, text, text, text, text, text, integer, integer), public.error_group_detail(uuid),
  public.error_group_update(uuid, text, uuid, boolean, text, text), public.firm_error_summary() from public, anon;
grant execute on function public.report_errors(jsonb), public.error_monitor_stats(date, date, uuid, text, text, text, text),
  public.error_monitor_list(date, date, uuid, text, text, text, text, text, integer, integer), public.error_group_detail(uuid),
  public.error_group_update(uuid, text, uuid, boolean, text, text), public.firm_error_summary() to authenticated;

commit;
