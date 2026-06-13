# CAATH Auth Signup Flow Trace

## Observed Failure

Observed pilot error:

`Authentication error: new row violates row-level security policy for table "users"`

The rejected table is `public.users`.

## Public Signup Entry Points

There are two public signup UI implementations in the current codebase:

| UI | File | Notes |
| --- | --- | --- |
| Current app login screen | `src/App.tsx` | Used when `App` renders unauthenticated login/create account UI |
| Standalone auth page | `src/pages/AuthPage.tsx` | Also calls the same onboarding service |

Both call:

`createAccountWithRole` in `src/services/accountOnboardingService.ts`

## Signup Flow

1. User opens Create Account.
2. UI collects full name, email, password, selected role, and optional firm ID.
3. UI calls `createAccountWithRole`.
4. `createAccountWithRole` enforces role governance:
   - Anonymous actor can create only `Client`.
   - SuperAdmin can create `Admin`, `Staff`, and `Client`.
   - Admin can create `Staff` and `Client`.
5. `createAccountWithRole` calls:

```ts
supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      requested_role: role,
      requested_firm_id: resolvedFirmId,
    },
  },
});
```

6. If Supabase returns a session immediately, or after the user verifies email and logs in, `AuthProvider` runs `loadUserProfile`.
7. `loadUserProfile` calls `authService.resolveUserProfile(session)`.
8. `resolveUserProfile` checks whether a CAATH profile already exists:

```ts
authProfileRepository.findByAuthId(session.user.id)
```

9. If no profile exists, it derives a safe role from auth metadata:
   - `Client` remains `Client`.
   - Any other requested role becomes `Staff`.
10. It calls:

```ts
authProfileRepository.createProfile({
  authId: session.user.id,
  email: session.user.email || '',
  name,
  role,
  firmId,
});
```

11. `createProfile` inserts into `public.users`.

## Failing Insert

The failing statement is in `src/domains/auth/repositories/SupabaseAuthProfileRepository.ts`:

```ts
supabase
  .from('users')
  .insert([{
    auth_id: payload.authId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: 'Active',
    firm_id: payload.firmId,
  }])
  .select('id, auth_id, firm_id, name, email, role, status, created_at')
  .single();
```

## Authentication Context At Failure Time

The user is authenticated at the Supabase Auth layer when `resolveUserProfile` runs, but the CAATH application profile does not exist yet.

That distinction matters:

| Layer | State |
| --- | --- |
| Supabase Auth | User exists and may have an active session |
| CAATH `public.users` profile | Missing |
| RLS helper functions | Depend on the missing `public.users` profile |

## Why Client Signup Fails

The new Client profile insert is evaluated by `public.users` RLS. The active policies allow inserts only for GodAdmin or existing SuperAdmin-scoped users. A brand-new Client is neither.

This creates a circular dependency:

1. The user needs a `public.users` row to satisfy RLS helper functions.
2. The user cannot insert the first `public.users` row because those helper functions return no role/firm.

## Trigger Or Function Involvement

No repository trigger was found that automatically creates `public.users` rows from `auth.users`.

There are helper functions:

- `public.current_user_profile_id()`
- `public.current_user_firm_id()`
- `public.current_user_role()`
- `public.is_god_admin()`

These are used by RLS policies, but they do not create profiles.

## Conclusion

The failure occurs after `supabase.auth.signUp()` when CAATH attempts to create the application profile in `public.users`. The insert is blocked by RLS because there is no secure first-profile creation path for public Client signup.

