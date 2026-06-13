# RLS Root Cause Analysis

Generated: 2026-06-13

## Failure

Observed error: `new row violates row-level security policy for table "users"`.

## Root Cause

`public.users` has RLS enabled in `supabase/schema.sql`, with:

- `users_select_scope` for SELECT.
- `users_superadmin_manage` for ALL, limited to GodAdmin or same-firm SuperAdmin.

There was no policy allowing a newly authenticated user to insert their own Client profile. During first session/profile resolution, `authProfileRepository.createProfile()` inserts into `public.users`; the authenticated user has an `auth.uid()` but has no existing `public.users` row, so `current_user_role()` and `current_user_firm_id()` return null and `users_superadmin_manage` cannot pass.

## Secondary Constraint Issue

`public.users.users_firm_required` requires every non-GodAdmin row to have `firm_id`. The prior UI labeled Firm ID optional, so profile insertion could also fail when no firm ID was supplied.

## Fix Applied

Added `supabase/migrations/20260613_auth_onboarding_rls_stabilization.sql`:

- Keeps RLS enabled.
- Adds `users_self_client_insert`.
- Allows authenticated INSERT only when `auth_id = auth.uid()`, `role = 'Client'`, `status = 'Active'`, `firm_id IS NOT NULL`, and browser cannot spoof `created_by`/`updated_by`.

## Trigger/Function Finding

No `auth.users` signup trigger or `handle_new_user` function exists in the inspected Supabase files. The failing insert is client-initiated profile creation in `SupabaseAuthProfileRepository.createProfile()`.
