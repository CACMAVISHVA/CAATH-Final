# CAATH Auth Root Cause And Fix

Generated: 2026-06-04

## Root Cause Classification

Primary classification: Stored session.

Secondary classification: Development origin hygiene.

Not classified as:

- Hostname bypass
- Mock auth bypass
- Auto-login flow
- Routing issue
- Supabase provider malfunction

## Exact Cause

`http://127.0.0.1:3000` and `http://192.168.29.136:3000` are separate browser origins. Supabase session persistence is scoped to the current origin in the browser.

The code path is:

1. `src/main.tsx` renders `AppProviders`.
2. `AppProviders` mounts `AuthProvider`.
3. `AuthProvider` calls `authService.getSession()`.
4. `authService.getSession()` calls `SupabaseAuthRepository.getSession()`.
5. `SupabaseAuthRepository.getSession()` calls `supabase.auth.getSession()`.
6. If a valid session exists for that origin, CAATH resolves `public.users`.
7. If `user` is resolved and active, `src/App.tsx` renders the dashboard.
8. If no valid session/profile exists, `src/App.tsx` renders the login page.

Therefore:

- `127.0.0.1:3000` shows login because no valid session/profile was restored for that origin.
- `192.168.29.136:3000` opens dashboard because a valid session/profile was restored for that origin.

## Is This A Security Issue?

Not by itself.

This is expected browser-origin session behavior. It becomes a security issue only if the restored session is unexpected, belongs to a shared/test account, or remains available on a machine where it should have been cleared.

## Correct Fix

Recommended fix: normalize development and deployment origin handling.

1. Choose one canonical local development origin.
   - Example: use `http://127.0.0.1:3000` for local-only development.
   - Use LAN IP only when testing from another device.

2. Clear the unexpected origin session.
   - Open `http://192.168.29.136:3000`.
   - Use CAATH Logout.
   - Reload the page.
   - If still authenticated, clear local storage for that origin from browser devtools.

3. Confirm Supabase project URL settings.
   - Development may allow local origins.
   - Production should allow only approved production domains.
   - Do not leave arbitrary LAN origins allowed in production redirect settings.

4. Keep seeded users out of production operations.
   - Seed identities exist in `supabase/seed.sql`.
   - Passwords are not hardcoded, but any created seed users should be rotated or removed before customer onboarding.

5. Improve session visibility for development.
   - Optional safe enhancement: add a dev-only diagnostic showing current origin, user email, role, and tenant id.
   - Optional safe enhancement: add a dev-only "clear current origin session" utility that calls logout and clears known local app preference keys for the current origin.

## How To Safely Log Into CAATH

1. Use a real Supabase Auth user.
2. Ensure the user has an active CAATH profile in `public.users`.
3. Use one origin consistently.
4. If testing seed identities, create them with unique strong passwords in Supabase Dashboard or CLI.
5. After testing on LAN IP, sign out from that same LAN-origin URL.

## Immediate Operator Answer

| Question | Answer |
|---|---|
| Why does localhost show login? | No valid session/profile exists for `http://127.0.0.1:3000`. |
| Why does LAN IP open dashboard? | A valid Supabase session exists for `http://192.168.29.136:3000`. |
| Is this a security issue? | Not inherently. It is a persisted session difference across origins. Treat as a development hygiene risk if the account is unexpected. |
| What credentials exist? | Seed emails exist in `supabase/seed.sql`; no usable hardcoded passwords found. |
| How should I log in safely? | Use a real Supabase user with an active `public.users` profile, on one canonical origin, and sign out/clear storage when switching origins. |

