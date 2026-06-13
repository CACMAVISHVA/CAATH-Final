# CAATH Supabase RLS Audit

## Audited Tables

The signup failure concerns `public.users`. Related onboarding tables are:

- `public.users`
- `public.firms`
- `public.subscriptions`
- `public.client_contacts`
- `public.workforce_profiles`

No `public.profiles` table was found in the audited schema or application data access paths. CAATH uses `public.users` as the application profile table.

## public.users

### Table Constraints

`public.users` includes:

| Column | Notes |
| --- | --- |
| `auth_id` | Required, unique, references `auth.users(id)` |
| `firm_id` | Required for every role except `GodAdmin` |
| `role` | Must be `GodAdmin`, `SuperAdmin`, `Admin`, `Staff`, or `Client` |
| `status` | Must be `Active`, `Inactive`, or `Suspended` |

Important check:

```sql
CONSTRAINT users_firm_required CHECK (
  (role = 'GodAdmin' AND firm_id IS NULL)
  OR (role != 'GodAdmin' AND firm_id IS NOT NULL)
)
```

### RLS Enabled

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### Policies

#### `users_select_scope`

```sql
CREATE POLICY users_select_scope ON public.users FOR SELECT
USING (
  public.is_god_admin()
  OR auth_id = auth.uid()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);
```

Allows:

- GodAdmin to select users.
- A user to select their own row.
- SuperAdmin/Admin to select users in their firm.

#### `users_superadmin_manage`

```sql
CREATE POLICY users_superadmin_manage ON public.users FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
);
```

Allows writes only when:

- Current user is GodAdmin, or
- Current user is SuperAdmin for the target firm.

It does not allow a newly authenticated user to insert their own first Client profile.

## public.firms

### RLS Enabled

```sql
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
```

### Policies

#### `firms_godadmin_all`

```sql
CREATE POLICY firms_godadmin_all ON public.firms FOR ALL
USING (public.is_god_admin())
WITH CHECK (public.is_god_admin());
```

Only GodAdmin can create/update/delete firms.

#### `firms_firm_users_select`

```sql
CREATE POLICY firms_firm_users_select ON public.firms FOR SELECT
USING (id = public.current_user_firm_id());
```

Users can select only their own firm, but this depends on already having a `public.users` row.

## public.profiles

No `public.profiles` table was found.

The application profile equivalent is `public.users`.

## Onboarding-Related Tables

### public.subscriptions

RLS enabled in `schema.sql`.

Relevant policies:

- `subscriptions_godadmin_all`: GodAdmin can manage all subscriptions.
- `subscriptions_superadmin_scope`: SuperAdmin can manage subscriptions in their firm.

The firm provisioning flow inserts subscription shells as GodAdmin.

### public.client_contacts

RLS enabled in `schema.sql`.

Policy:

```sql
CREATE POLICY client_contacts_scope ON public.client_contacts FOR ALL
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
)
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
);
```

This also depends on an existing `public.users` profile.

### public.workforce_profiles

Created in `supabase/migrations/20260521_workforce_payroll_foundation.sql`.

RLS enabled in `supabase/migrations/20260523_phase2_security_stabilization.sql` if the table exists:

```sql
CREATE POLICY workforce_profiles_tenant_scope ON public.workforce_profiles
FOR ALL TO authenticated
USING ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'))
WITH CHECK ((auth.jwt()->>'role') = 'GodAdmin' OR firm_id::text = (auth.jwt()->>'firm_id'));
```

This table is not involved in public Client signup.

## Helper Functions Used By RLS

The main schema defines:

```sql
public.current_user_profile_id()
public.current_user_firm_id()
public.current_user_role()
public.is_god_admin()
```

These functions read `public.users` by `auth.uid()`.

That design works after a profile exists. It fails for first-time profile creation unless a separate bootstrap path exists.

## Missing Policy Or Mechanism

There is no narrowly scoped policy or function that allows an authenticated user to create their own first `Client` profile.

There is also no trigger from `auth.users` to `public.users`.

## Security Assessment

RLS itself is not wrong. The missing piece is a secure bootstrap path for allowed self-service Client profiles.

Do not disable RLS. Do not allow anonymous writes to `public.users`. Do not add broad `TO authenticated INSERT` access without strict checks.

