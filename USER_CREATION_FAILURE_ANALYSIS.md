# CAATH User Creation Failure Analysis

## Executive Summary

Client self-service signup fails because CAATH creates the Supabase Auth account first, then tries to insert the CAATH application profile into `public.users` from the browser using the new user's session.

`public.users` has RLS enabled and only permits writes by GodAdmin or existing firm SuperAdmin users. A brand-new Client does not yet have a `public.users` row, so the RLS helper functions cannot identify their role or firm. The first profile insert is rejected.

## Root Cause

Root cause:

`public.users` RLS has no secure first-profile creation path for self-service Client signup.

The policy model assumes the actor already has a CAATH profile, but public signup is the process that is trying to create that profile.

## Direct Cause

The failing insert is:

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
```

This runs in `authProfileRepository.createProfile`.

## Why Existing Policies Reject It

The write policy on `public.users` is:

```sql
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
```

For a brand-new Client:

| Check | Result |
| --- | --- |
| `public.is_god_admin()` | False |
| `public.current_user_role()` | Null, because no `public.users` row exists yet |
| `public.current_user_firm_id()` | Null, because no `public.users` row exists yet |
| SuperAdmin firm match | False |

Result: RLS rejects the insert.

## Is The App Creating A Profile Before Auth Context Exists?

Not exactly.

The Supabase Auth context may exist when the profile insert runs. The missing context is the CAATH application profile context in `public.users`.

So the accurate diagnosis is:

The app is creating the first CAATH profile before CAATH role/firm context exists, and RLS requires that role/firm context.

## Is A Trigger Or Function Involved?

No signup trigger was found.

RLS helper functions are involved, but they only read current user context from `public.users`; they do not create user rows.

## Is Firm Provisioning Logic Causing This?

Firm provisioning is related but not the direct cause.

For Client signup, a valid firm workspace must already exist because `public.users` requires `firm_id` for all non-GodAdmin users. If the public signup omits Firm ID, it will also fail due to the table check constraint or invalid tenant association.

However, the observed RLS error occurs even with Client signup because RLS rejects the first `public.users` insert before the user has an application profile.

## Minimum Secure Fix

Recommended minimum secure fix:

Create a narrowly scoped, server-side bootstrap path for Client self-service profile creation.

Preferred implementation:

1. Add a `SECURITY DEFINER` database function such as `public.create_client_self_profile`.
2. Allow only authenticated users to execute it.
3. Inside the function, validate:
   - `auth.uid()` is present.
   - No `public.users` row already exists for `auth.uid()`.
   - Requested role is always forced to `Client`.
   - `auth_id` is always `auth.uid()`, never client-supplied.
   - Email comes from `auth.jwt()->>'email'` or `auth.users`, not arbitrary input.
   - `firm_id` is required.
   - The target firm exists and is `Active` or explicitly allowed for pilot onboarding.
4. Insert only:
   - `auth_id = auth.uid()`
   - `role = 'Client'`
   - `firm_id = validated_firm_id`
   - `status = 'Active'` or `Pending` if manual approval is desired.
5. Update frontend profile creation to call this function only for Client self-service.

Alternative minimum fix:

Add a very narrow `INSERT` policy on `public.users` for authenticated users:

```sql
CREATE POLICY users_client_self_insert
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth_id = auth.uid()
  AND role = 'Client'
  AND firm_id IS NOT NULL
);
```

This is less preferred unless paired with a secure firm validation helper, because it allows any authenticated signup to attach themselves as a Client to any known firm ID.

## What Not To Do

Do not:

- Disable RLS on `public.users`.
- Allow anonymous inserts into `public.users`.
- Allow self-service creation of SuperAdmin, Admin, or Staff.
- Trust `requested_role` metadata for privileged roles.
- Allow arbitrary client-supplied `auth_id`.
- Make `users_superadmin_manage` broader.

## Correct Pilot Direction

For internal pilot, use controlled provisioning for privileged users:

- Create Auth users through Supabase Dashboard or CLI.
- Activate CAATH profiles through GodAdmin provisioning.
- Use public signup only for Client accounts after the pilot firm exists.
- Prefer provisioning Clients internally until the secure Client bootstrap function exists.

