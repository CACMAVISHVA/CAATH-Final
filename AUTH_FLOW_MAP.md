# CAATH Authentication Flow Map

Generated: 2026-06-04

## Executive Finding

CAATH authentication is driven by Supabase Auth session restoration plus a profile lookup in `public.users`. The root app does not render the protected workspace unless `AuthContext` has resolved a non-null `user`.

## Startup Flow

1. `src/main.tsx`
   - Starts the production runtime kernel.
   - Renders `<AppProviders><AppRoutes /></AppProviders>`.

2. `src/app/providers/AppProviders.tsx`
   - Mounts `BrowserRouter`.
   - Mounts `AuthProvider`.
   - Mounts UI and toast providers.
   - Calls `syncAuthState(user)` after auth state changes.

3. `src/context/AuthContext.tsx`
   - Initializes `session`, `user`, `isLoading`, and `error`.
   - On mount, calls `authService.getSession()`.
   - Validates `session.expires_at` with `authService.isSessionActive`.
   - Calls `loadUserProfile(session)`.
   - Subscribes to `authService.onAuthStateChange`.
   - Refreshes the session every 10 minutes while authenticated.

4. `src/domains/auth/services/authService.ts`
   - Delegates session operations to `SupabaseAuthRepository`.
   - Resolves user profile from `SupabaseAuthProfileRepository`.
   - Creates a profile if the Supabase auth user exists but `public.users` has no matching `auth_id`.
   - Defaults metadata-created users to `Client` only when requested metadata says `Client`; otherwise falls back to `Staff`.

5. `src/domains/auth/repositories/SupabaseAuthRepository.ts`
   - `signIn` uses `supabase.auth.signInWithPassword`.
   - `signOut` uses `supabase.auth.signOut`.
   - `getSession` uses `supabase.auth.getSession`.
   - `refreshSession` uses `supabase.auth.refreshSession`.
   - `onAuthStateChange` uses `supabase.auth.onAuthStateChange`.

6. `src/domains/auth/repositories/SupabaseAuthProfileRepository.ts`
   - Looks up `public.users` by `auth_id`.
   - Maps `id`, `auth_id`, `firm_id`, `name`, `email`, `role`, `status`, and `created_at`.
   - Inserts a profile if no profile exists.

7. `src/App.tsx`
   - Reads `{ user, session, isLoading, error, login, logout }` from `useAuth`.
   - Shows a loading screen while `isLoading`.
   - Shows `LoginScreen` when `!user`.
   - Renders the protected shell only after a user exists.
   - Uses `ProtectedRoute` for module-level role gates.

8. `src/routes/ProtectedRoute.tsx`
   - Shows a loading state while auth is loading.
   - Blocks rendering if `!user`.
   - Blocks rendering if `roles` is present and the current role is not included.

## Storage And Session Usage

| Area | Storage | Purpose | Auth Impact |
|---|---|---|---|
| Supabase Auth client | Browser origin storage via default Supabase client behavior | Persist auth session | Primary reason a previous login survives page reloads |
| `src/context/AuthContext.tsx` | React state | Holds current session/user | Determines login vs workspace |
| `src/app/bootstrap/syncAuthState.ts` | In-memory stores | Mirrors authenticated user id, role, tenant id | No login bypass; depends on `user` |
| `src/App.tsx` | `localStorage` | Onboarding completion/hidden state by user id | Does not authenticate |
| `src/context/UIContext.tsx` | `localStorage` plus Supabase user lookup | UI style preferences | Does not authenticate |
| Workspace/search/productivity services | `localStorage` | Preferences, recent searches, local workflow memory | Does not authenticate |
| `src/components/PayrollWorkspace.tsx` | `sessionStorage` | Temporary payroll unlock timestamp | Requires existing user and password re-entry |
| `src/lib/authSecurityUtils.ts` | `sessionStorage.clear()` on logout | Clears sessionStorage only after Supabase sign-out | Supabase sign-out is the real auth cleanup |

## Cookie Usage

No direct `document.cookie` auth flow was found in the searched source. Authentication is Supabase client based.

## Supabase Usage

Supabase is initialized in `src/lib/supabase.ts`:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

No custom `auth.storage`, `storageKey`, or `persistSession` override is configured in this file.

## Custom Auth Usage

CAATH has a custom application auth layer on top of Supabase:

- `AuthContext` controls React auth state.
- `authService` normalizes login/logout/session operations.
- `SupabaseAuthProfileRepository` maps Supabase auth users to CAATH `public.users` profiles.
- `syncAuthState` mirrors the resolved app user into global state.

There is no custom password verifier, mock token issuer, or local-only auth provider in the active flow.

