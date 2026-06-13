# CAATH Authentication Behavior Audit

Generated: 2026-06-04

## Observed Behavior

| Origin | Observed Result |
|---|---|
| `http://127.0.0.1:3000` | Login page |
| `http://192.168.29.136:3000` | Dashboard |

## Root Explanation

The two URLs are different browser origins.

Browser origin includes scheme, host, and port:

- `http://127.0.0.1:3000`
- `http://192.168.29.136:3000`

Because these are different origins, browser storage is separate. A Supabase session can exist for `192.168.29.136:3000` while no Supabase session exists for `127.0.0.1:3000`.

The app code supports this explanation:

- `src/lib/supabase.ts` creates a default Supabase browser client without a custom storage key.
- `src/context/AuthContext.tsx` calls `authService.getSession()` on startup.
- `src/domains/auth/repositories/SupabaseAuthRepository.ts` implements `getSession()` through `supabase.auth.getSession()`.
- `src/App.tsx` renders login only when `!user`.
- Therefore, dashboard on `192.168.29.136:3000` means `getSession()` returned a valid session for that origin and `resolveUserProfile()` returned an active user profile.
- Login on `127.0.0.1:3000` means no valid session/profile was restored for that origin.

## What Was Checked

| Check | Result |
|---|---|
| Hostname checks | No `window.location.hostname`, `location.host`, `localhost`, or `127.0.0.1` auth branching found in `src` search. |
| Development bypass | No active `bypassAuth`, `autoLogin`, `devLogin`, or `mockAuth` flow found. |
| Demo user auto-fill | `LoginScreen` has a dev-mode panel condition, but `devUsers` is an empty array. Nothing renders. |
| Seed users | Seed identities exist in `supabase/seed.sql`, but passwords are redacted placeholders. |
| Supabase auth | Active login/session restoration uses Supabase Auth. |
| Custom auth | Custom layer resolves CAATH role/profile after Supabase session restore. |

## Why `127.0.0.1:3000` Shows Login

The app starts, `AuthProvider` calls `getSession()`, and no valid Supabase session is found for the `127.0.0.1:3000` origin. `user` remains null, so `src/App.tsx` renders `LoginScreen`.

## Why `192.168.29.136:3000` Opens Dashboard

The app starts, `AuthProvider` calls `getSession()`, and a valid Supabase session is restored for the `192.168.29.136:3000` origin. CAATH then loads or creates a `public.users` profile. Since `user` is non-null and active, `src/App.tsx` renders the protected workspace.

## Security Classification

Classification: Stored session.

This is not evidence of an auth bypass by itself. It is normal behavior when a user previously logged in on one origin and the browser retained that origin's Supabase session.

Risk remains if:

- The `192.168.29.136:3000` session belongs to an unexpected user.
- Seed/demo users were created in a shared Supabase project with weak passwords.
- A developer machine is shared and browser storage is not cleared after testing.
- Supabase redirect/site URL policy allows untrusted origins in production.

## Verification Steps

1. Open browser devtools on `http://192.168.29.136:3000`.
2. Inspect Application > Local Storage for that origin.
3. Look for Supabase auth session storage, commonly a key beginning with `sb-`.
4. Repeat on `http://127.0.0.1:3000`.
5. Compare whether the Supabase session key exists on one origin and not the other.
6. Click Logout on the dashboard origin and reload `http://192.168.29.136:3000`.
7. Expected result after logout: login page, unless another valid session is restored.

