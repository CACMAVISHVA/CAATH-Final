# Create CAATH Workspace Onboarding Debug Report

Date: 2026-06-17

## Flow Trace

1. `src/App.tsx:1039` calls `createWorkspaceOwnerAccount(...)` from the Create Workspace form.
2. `src/services/accountOnboardingService.ts:161` calls `supabase.auth.signUp(...)`.
3. Before this fix, the same function attempted direct browser inserts into `public.firms` and `public.users`.
4. `src/services/accountOnboardingService.ts:196` now calls `public.create_workspace_owner(...)` through Supabase RPC.
5. `supabase/migrations/20260617_workspace_owner_bootstrap_rpc.sql:3` defines the transactional bootstrap function.

## Root Cause

`auth.users` was created successfully, but the post-signup profile bootstrap depended on direct frontend inserts into RLS-protected tables. The `public.users` profile row was not reliably created, leaving newly registered emails present in Supabase Authentication but absent from `public.users`. Later login then failed while resolving the app profile.

Prior direct insert responsibility:

- `src/services/accountOnboardingService.ts:161` created the Auth user.
- The removed direct `public.firms` insert ran immediately after sign-up.
- The removed direct `public.users` insert attempted to write `auth_id`, `firm_id`, `email`, `role='SuperAdmin'`, `status='Active'`, and `is_workspace_owner=true`.

## Fix

- `src/services/accountOnboardingService.ts:194` logs the intended profile insert payload:
  - `auth_id`
  - `email`
  - `role`
  - `status`
  - `firm_id`
- `src/services/accountOnboardingService.ts:196` calls `create_workspace_owner` instead of direct table inserts.
- `src/services/accountOnboardingService.ts:212` logs hidden bootstrap failures with the payload and Supabase error.
- `src/services/accountOnboardingService.ts:216` throws `WorkspaceOnboardingError` with the actual database message, details, hint, and code.
- `src/App.tsx:1050` surfaces `WorkspaceOnboardingError` directly in the Create Workspace UI instead of normalizing it to a generic auth error.
- `MISSING_AUTH_TABLES.sql:510` also installs the same RPC for emergency repair runs.

## Database Bootstrap Function

`public.create_workspace_owner(...)`:

- Requires `auth.uid()` to exist.
- Verifies the requested email matches `auth.users.email`.
- Rejects duplicate `public.users.auth_id`.
- Creates the firm.
- Creates the `SuperAdmin` row in `public.users`.
- Populates `public.users.auth_id` from `auth.uid()`.
- Emits a database log containing `auth_id`, `email`, `role`, `status`, and `firm_id`.

## Verification

- `npm run build` passed on 2026-06-17.
