# CAATH Auth Risk Report

Generated: 2026-06-04

## Search Terms Audited

Searched for:

- `localhost`
- `127.0.0.1`
- `window.location.hostname`
- `mockAuth`
- `devLogin`
- `autoLogin`
- `bypassAuth`
- `seedUser`
- `godadmin`
- `admin@caath`
- `supabase.auth`
- `localStorage`
- `sessionStorage`
- `document.cookie`
- `getSession`
- `onAuthStateChange`
- `signInWithPassword`
- `signOut`

## Key Findings

| Risk Area | Status | Evidence |
|---|---|---|
| Hostname-specific auth bypass | Not found | No auth branching on `localhost`, `127.0.0.1`, `192.168`, `window.location.hostname`, or `location.host` found in searched `src` files. |
| Mock auth provider | Not found | No `mockAuth` auth provider found. |
| Auto-login/dev-login bypass | Not found | No active `autoLogin`, `devLogin`, or `bypassAuth` flow found. |
| Supabase session restoration | Present | `AuthContext` -> `authService.getSession()` -> `supabase.auth.getSession()`. |
| Supabase email/password login | Present | `SupabaseAuthRepository.signIn()` uses `supabase.auth.signInWithPassword`. |
| Supabase signup | Present | `accountOnboardingService.createAccountWithRole()` uses `supabase.auth.signUp`. |
| Seeded users | Present in seed docs/scripts | `supabase/seed.sql` and `supabase/README.md` list seed emails. Passwords are redacted placeholders. |
| Client-side seed users | Disabled | `src/services/devSeedService.ts` returns disabled message and `checkDevUsersExist()` returns false. |
| Dev credential UI | Inert | `src/App.tsx` defines `devUsers = []`, so the dev credential panel never renders. |
| Cookie auth | Not found | No direct `document.cookie` auth flow found in searched source. |
| Logout cleanup | Partial hygiene issue | `performSecureLogout()` calls Supabase sign-out, then clears `sessionStorage`; it does not clear all local app preference keys. |

## Notable Source References

| Source | Finding |
|---|---|
| `src/lib/supabase.ts` | Default Supabase client creation. |
| `src/context/AuthContext.tsx` | Startup session restore, auth state subscription, session refresh. |
| `src/domains/auth/services/authService.ts` | Login/logout/session/profile orchestration. |
| `src/domains/auth/repositories/SupabaseAuthRepository.ts` | Direct Supabase Auth calls. |
| `src/domains/auth/repositories/SupabaseAuthProfileRepository.ts` | `public.users` profile lookup and creation. |
| `src/App.tsx` | Root login gate and protected workspace render. |
| `src/routes/ProtectedRoute.tsx` | Module-level role gate. |
| `src/services/accountOnboardingService.ts` | Signup and role creation governance. |
| `src/services/devSeedService.ts` | Client-side seeding disabled. |
| `supabase/seed.sql` | Seed identity list and profile rows. |
| `supabase/README.md` | Seed setup instructions. |

## Security Assessment

Current observed behavior is best classified as a persisted-session/origin-storage difference, not a confirmed security bypass.

However, before production deployment:

- Do not use shared seed identities in a real tenant.
- Confirm Supabase redirect/site URL configuration only includes approved origins.
- Confirm users can reliably sign out from every development origin.
- Consider adding a clear "current origin / current user" debug-only banner for local development.
- Consider a development utility to clear Supabase auth storage for the current origin.

