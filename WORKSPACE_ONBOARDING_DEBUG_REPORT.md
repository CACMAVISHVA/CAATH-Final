# Create CAATH Workspace Onboarding Debug Report

Date: 2026-06-17

## Flow Trace

1. `src/App.tsx:1039` calls `createWorkspaceOwnerAccount(...)` from the Create Workspace form.
2. `src/services/accountOnboardingService.ts:161` calls `supabase.auth.signUp(...)`.
3. `src/services/accountOnboardingService.ts:179` logs the created `auth.users.id`, email, and intended role.
4. `src/services/accountOnboardingService.ts:199` logs the intended `public.users` profile insert payload.
5. `src/services/accountOnboardingService.ts:201` calls `public.create_workspace_owner(...)` through Supabase RPC.
6. `src/services/accountOnboardingService.ts:242` logs the profile insert response with `auth_id`, email, `firm_id`, role, and `user_id`.
7. `supabase/migrations/20260617_workspace_owner_bootstrap_rpc.sql:3` defines the transactional bootstrap function.

## Root Cause

`auth.users` was created successfully, but the post-signup workspace bootstrap did not guarantee the complete app-side tenant records. The required application identity is `public.users.auth_id = auth.users.id`; without that row, login resolves a valid Supabase Auth session but cannot load the CAATH workspace profile.

Confirmed issue boundaries:

- `src/services/accountOnboardingService.ts:161` created the Auth user.
- The onboarding bootstrap must create `public.firms`, `public.subscriptions`, and `public.users`.
- `src/domains/auth/services/authService.ts:190` now treats missing `public.users` as `Profile not found. Workspace setup incomplete.`
- `src/context/AuthContext.tsx:100` and `src/context/AuthContext.tsx:130` preserve and surface that exact message instead of normalizing it to a generic authentication error.

## Fix

- `src/services/accountOnboardingService.ts:179` logs the created Auth user:
  - `authUserId`
  - `email`
  - `role`
- `src/services/accountOnboardingService.ts:199` logs the intended profile insert payload:
  - `auth_id`
  - `email`
  - `role`
  - `status`
  - `firm_id`
- `src/services/accountOnboardingService.ts:201` calls `create_workspace_owner`.
- `src/services/accountOnboardingService.ts:217` logs hidden bootstrap failures with the payload and Supabase error.
- `src/services/accountOnboardingService.ts:221` throws `WorkspaceOnboardingError` with the actual database message, details, hint, and code.
- `src/services/accountOnboardingService.ts:242` logs the profile insert response.
- `src/App.tsx:1050` surfaces `WorkspaceOnboardingError` directly in the Create Workspace UI instead of normalizing it to a generic auth error.
- `src/App.tsx:543` tells authenticated users exactly when the linked `public.users` row is missing.
- `MISSING_AUTH_TABLES.sql:510` also installs the same RPC for emergency repair runs.

## Database Bootstrap Function

`public.create_workspace_owner(...)`:

- Requires `auth.uid()` to exist.
- Verifies the requested email matches `auth.users.email`.
- Rejects duplicate `public.users.auth_id`.
- Creates the firm at `supabase/migrations/20260617_workspace_owner_bootstrap_rpc.sql:70`.
- Creates the subscription at `supabase/migrations/20260617_workspace_owner_bootstrap_rpc.sql:102`.
- Creates the `SuperAdmin` row in `public.users` at `supabase/migrations/20260617_workspace_owner_bootstrap_rpc.sql:138`.
- Populates `public.users.auth_id` from `auth.uid()`.
- Emits a database log containing `auth_id`, `email`, `role`, `status`, and `firm_id`.

## Sign-Out Audit

Search terms checked: `signOut()`, `logout()`, `clearSession()`, `resetSession()`, `setSession(null)`, and `setUser(null)`.

- No `clearSession()` or `resetSession()` code path was found.
- `src/domains/auth/services/authService.ts:34` signs out only after successful OTP delivery when OTP is explicitly enabled.
- `src/domains/auth/services/authService.ts:142` signs out only through explicit logout.
- `src/context/AuthContext.tsx:90`, `src/context/AuthContext.tsx:118`, `src/context/AuthContext.tsx:151`, and `src/context/AuthContext.tsx:159` clear session only for expired or failed session refresh cases.
- Profile lookup failure now keeps `session` and reports `Profile not found. Workspace setup incomplete.`

## Verification

- `npm run build` passed on 2026-06-17.
