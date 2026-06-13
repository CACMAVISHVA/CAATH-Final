# CAATH Authentication Lifecycle Map

Generated: 2026-06-13

## Current Lifecycle

1. Public signup starts in `LoginScreen` in `src/App.tsx` or the standalone `src/pages/AuthPage.tsx`.
2. Self-service signup is now locked to `Client`; privileged roles are not exposed.
3. Signup calls `createAccountWithRole()` in `src/services/accountOnboardingService.ts`.
4. `createAccountWithRole()` validates role governance, requires a `firmId` for non-GodAdmin users, then calls `supabase.auth.signUp()` with `full_name`, `requested_role`, and `requested_firm_id` metadata.
5. Supabase creates the `auth.users` identity.
6. On session creation or restoration, `AuthProvider` calls `authService.resolveUserProfile()`.
7. `resolveUserProfile()` looks up `public.users` by `auth_id`.
8. If no profile exists, it creates a profile in `public.users` using safe metadata resolution: only `Client` metadata remains `Client`; all unsupported values resolve to `Staff` in service logic, but browser self-service now only submits `Client`.
9. Login uses `authService.login()` -> `SupabaseAuthRepository.signIn()` -> `supabase.auth.signInWithPassword()`.
10. Session restore uses `supabase.auth.getSession()` through `authService.getSession()`.
11. Runtime session refresh runs every 10 minutes through `authService.refreshSession()`.
12. Logout uses `authService.logout()` -> secure local cleanup -> `supabase.auth.signOut()`.
13. Forgot password uses `authService.sendPasswordReset()` -> `supabase.auth.resetPasswordForEmail()`.
14. Reset password uses recovery URL detection (`?auth=recovery` or hash `type=recovery`) and `authService.updatePassword()` -> `supabase.auth.updateUser({ password })`.

## Trust Boundaries

Browser self-service may create only Client accounts and must provide a firm workspace ID. SuperAdmin, Admin, Staff, and GodAdmin are provisioned by approved operator/admin workflows, not public signup.

## Remaining Runtime Dependency

Email delivery, reset token redemption, and live account creation require a deployed Supabase project with auth email templates and redirect URLs configured.
