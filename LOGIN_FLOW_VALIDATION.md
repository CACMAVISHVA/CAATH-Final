# Login Flow Validation

Generated: 2026-06-13

## Code Validation

- Valid credentials: `authService.login()` calls `supabase.auth.signInWithPassword()` and audits success.
- Invalid credentials: errors are normalized through `normalizeAuthError()` and surfaced as `Invalid email or password. Please try again.`
- Session persistence: Supabase client default persistence is used; `AuthProvider` restores via `getSession()`.
- Refresh/browser restart: session is loaded on app boot and profile is resolved from `public.users`.
- Logout: `authService.logout()` signs out and clears runtime auth state.
- Expired sessions: `AuthProvider` checks `expires_at`, refreshes periodically, and displays a safe session-expired message.
- Multi-tab behavior: Supabase `onAuthStateChange()` is registered; default Supabase browser storage behavior propagates auth state across tabs.

## UX Validation

Raw Supabase and database errors are normalized before display. RLS and constraint failures now become user-safe onboarding messages.

## Not Executed In This Environment

Live credential login, browser restart, and multi-tab runtime verification require a running Supabase pilot project and test accounts.
