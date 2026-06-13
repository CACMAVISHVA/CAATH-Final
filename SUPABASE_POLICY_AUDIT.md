# Supabase Policy Audit

Generated: 2026-06-13

## Audited Objects

- `public.users`
- `public.firms`
- `public.subscriptions`
- onboarding helper functions in `supabase/schema.sql`
- provisioning services in `src/services/firmProvisioningService.ts`

## Findings

`public.users`: RLS enabled. Existing SELECT policy is scoped to own profile, GodAdmin, or same-firm SuperAdmin/Admin. Existing write policy allowed GodAdmin and same-firm SuperAdmin only. Missing self Client insert policy caused signup profile creation failure.

`public.firms`: RLS enabled. GodAdmin has full access; firm users can select their current firm. Firm creation is intentionally GodAdmin-only through provisioning.

`public.subscriptions`: RLS enabled. GodAdmin and SuperAdmin scoped access. Provisioning creates subscription shell with a privileged platform user.

`profiles`, `memberships`, `user_roles`: no such active tables were found in the inspected schema; CAATH currently uses `public.users.role` and `public.users.firm_id`.

## Policy Change

`users_self_client_insert` is safe for internal pilot because it does not grant privileged-role creation and does not allow arbitrary profile ownership. It does still rely on possession of a valid firm ID for Client self-association, so external-pilot hardening should replace raw firm IDs with invitation tokens.

## Recommendation

Internal pilot can proceed after applying the new migration to the pilot Supabase database. Before external pilot, introduce invite/token-backed client onboarding and server-side privileged user creation.
