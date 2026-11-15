-- Workspace branding: per-organisation colour theme and light/dark workspace logos.
-- Additive only. Existing firm_branding rows (invoice logo) are untouched; a NULL theme
-- means "CAATH default appearance". Existing RLS already limits writes to the firm's
-- SuperAdmin and reads to the firm itself; the firm-branding bucket policies already
-- isolate objects by the firm-id folder, so no storage policy change is required.
begin;

create or replace function public.firm_branding_theme_is_valid(t jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select t is null or (
    jsonb_typeof(t) = 'object'
    and length(t::text) <= 2000
    and coalesce(t->>'mode', 'dark') in ('dark', 'light')
    and (t->>'preset' is null or t->>'preset' ~ '^[a-z0-9-]{1,40}$')
    and not exists (select 1 from jsonb_object_keys(t) k where k not in ('preset', 'mode', 'colors'))
    and jsonb_typeof(coalesce(t->'colors', '{}'::jsonb)) = 'object'
    and not exists (
      select 1 from jsonb_each(coalesce(t->'colors', '{}'::jsonb)) c
      where c.key not in ('primary', 'secondary', 'accent', 'sidebar', 'background', 'button', 'highlight')
         or jsonb_typeof(c.value) <> 'string'
         or (c.value #>> '{}') !~ '^#[0-9a-fA-F]{6}$'
    )
  )
$$;

alter table public.firm_branding
  add column if not exists theme jsonb,
  add column if not exists logo_light_path text,
  add column if not exists logo_dark_path text;

alter table public.firm_branding
  add constraint firm_branding_theme_valid check (public.firm_branding_theme_is_valid(theme)),
  add constraint firm_branding_logo_light_scoped check (
    logo_light_path is null or logo_light_path in (firm_id::text || '/workspace-logo-light.png', firm_id::text || '/workspace-logo-light.webp')),
  add constraint firm_branding_logo_dark_scoped check (
    logo_dark_path is null or logo_dark_path in (firm_id::text || '/workspace-logo-dark.png', firm_id::text || '/workspace-logo-dark.webp'));

commit;
