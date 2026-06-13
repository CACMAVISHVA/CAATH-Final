# CAATH Auth Methods Report

Generated: 2026-06-04

## Available Login Methods

| Method | Status | Source | Notes |
|---|---|---|---|
| Email/password login | Active | `src/domains/auth/repositories/SupabaseAuthRepository.ts` | Uses `supabase.auth.signInWithPassword`. |
| Existing Supabase session restore | Active | `src/context/AuthContext.tsx` | Uses `authService.getSession()` during app startup. |
| Supabase auth state listener | Active | `src/context/AuthContext.tsx` | Uses `onAuthStateChange` to update app state after login/logout/session changes. |
| Self-service signup | Active but governed | `src/services/accountOnboardingService.ts`, `src/App.tsx`, `src/pages/AuthPage.tsx` | Calls `supabase.auth.signUp`; unauthenticated role creation is restricted to `Client` by service logic. |
| Payroll step-up verification | Active | `src/components/PayrollWorkspace.tsx` | Reuses `authService.login` with current user's email and entered password. |
| Seeded users | Setup-only | `supabase/seed.sql`, `supabase/README.md` | Requires Supabase Dashboard or CLI creation with unique passwords. |
| Demo credential auto-fill | Inactive | `src/App.tsx` | Dev-mode panel exists only if `devUsers.length > 0`; array is empty. |
| Client-side dev seeding | Disabled | `src/services/devSeedService.ts` | Returns a disabled message. |
| SSO providers | Not found | Search found no OAuth/SSO provider login implementation. |

## Login Flow

1. User submits email/password in `LoginScreen`.
2. `src/App.tsx` calls `login(email, password)` from `AuthContext`.
3. `AuthContext.login()` calls `authService.login()`.
4. `authService.login()` rate-limits and calls `SupabaseAuthRepository.signIn()`.
5. Supabase Auth signs in with password.
6. Supabase emits auth state change.
7. `AuthContext` receives session and resolves CAATH profile from `public.users`.
8. App renders protected workspace when `user` is non-null and active.

## Signup Flow

1. User opens Create Account.
2. UI allows selecting roles from `ONBOARDING_ROLES`.
3. Service-level governance in `accountOnboardingService` restricts unauthenticated signup to `Client`.
4. `supabase.auth.signUp` is called with metadata:
   - `full_name`
   - `requested_role`
   - `requested_firm_id`
5. User must verify email if Supabase project requires confirmation.
6. On login, `authService.resolveUserProfile()` resolves or creates the CAATH profile.

## Current Safe Login Paths

- Use a real Supabase Auth user created through Supabase Dashboard or CLI.
- Ensure the corresponding `public.users` row exists and has `status = 'Active'`.
- Use the same browser origin consistently during local development.
- To test a clean login, sign out or clear browser storage for that exact origin.

