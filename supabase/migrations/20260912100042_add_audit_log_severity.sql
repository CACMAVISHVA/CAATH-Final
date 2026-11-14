-- Keep audit severity compatible with the Audit Center and existing writers.
-- Forward-only and non-destructive: existing rows are classified as info.
alter table public.audit_logs
  add column if not exists severity text;

update public.audit_logs
set severity = 'info'
where severity is null;

alter table public.audit_logs
  alter column severity set default 'info',
  alter column severity set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.audit_logs'::regclass
      and conname = 'audit_logs_severity_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_severity_check
      check (severity in ('info', 'warning', 'critical'));
  end if;
end
$$;

create index if not exists idx_audit_logs_severity
  on public.audit_logs(severity);
