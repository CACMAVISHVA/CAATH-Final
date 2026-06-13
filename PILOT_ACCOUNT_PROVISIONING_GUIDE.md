# CAATH Pilot Account Provisioning Guide

This guide reflects the current secure operating model after the signup/RLS audit.

## Current Rule

Do not rely on public self-service signup for pilot setup until the Client profile bootstrap issue is fixed.

Use controlled provisioning:

1. Create Supabase Auth users through Supabase Dashboard or CLI.
2. Create or activate CAATH profiles in `public.users` through the GodAdmin provisioning flow or seed script.
3. Ensure every non-GodAdmin user has a valid `firm_id`.

## Correctly Create The First Pilot Firm Admin

In current CAATH role terms, the first firm owner/admin should be `SuperAdmin`.

### Step 1: Ensure GodAdmin Exists

Create a Supabase Auth user for GodAdmin, then ensure `public.users` has:

| Field | Value |
| --- | --- |
| `auth_id` | GodAdmin auth user ID |
| `firm_id` | `NULL` |
| `role` | `GodAdmin` |
| `status` | `Active` |

The included seed setup uses:

`godadmin@caath.com`

### Step 2: Login As GodAdmin

Login to CAATH using the GodAdmin account.

### Step 3: Create The Pilot Firm

1. Open Platform Control Tower.
2. Open the `provisioning` tab.
3. Enter pilot firm details:
   - Firm Name
   - Initial Admin Name
   - Initial Admin Email
   - Plan
4. Click Create Firm Package.
5. Copy the generated Firm ID.

This creates:

- `public.firms` row
- `public.subscriptions` row
- provisioning instructions

### Step 4: Create The Firm Owner Auth User

In Supabase Dashboard -> Authentication -> Users:

1. Add the Initial Admin Email.
2. Set a secure pilot password.
3. Copy the new `auth.users.id`.

### Step 5: Activate The Firm Owner As SuperAdmin

In CAATH GodAdmin -> Provisioning -> Activate User Role:

| Field | Value |
| --- | --- |
| Firm ID | Pilot firm ID |
| Supabase Auth User ID | Firm owner auth user ID |
| Name | Firm owner name |
| Email | Firm owner email |
| Role | `SuperAdmin` |

Click Activate Workspace User.

The firm owner can now login and operate the pilot firm workspace.

## Correctly Create Admin And Staff Accounts

Repeat for each internal firm user:

1. Create Supabase Auth user through Dashboard or CLI.
2. Copy `auth.users.id`.
3. As GodAdmin, open Platform Control Tower -> Provisioning.
4. Activate the user with:
   - Pilot Firm ID
   - Supabase Auth User ID
   - Name
   - Email
   - Role: `Admin` or `Staff`

Do not use public Create Account for Admin or Staff.

## Correctly Create Client Accounts

### Recommended Pilot Method

Until the secure Client bootstrap fix is implemented, provision Clients internally:

1. Create the Client in Supabase Authentication.
2. Copy the Client `auth.users.id`.
3. As GodAdmin, open Platform Control Tower -> Provisioning.
4. Activate:
   - Firm ID: pilot firm ID
   - Supabase Auth User ID: Client auth user ID
   - Name: Client name
   - Email: Client email
   - Role: `Client`

### Public Signup Method After Fix

After adding the secure Client profile bootstrap function:

1. Open public Create Account.
2. Lock Profile Type to `Client`.
3. Require Firm ID.
4. Submit full name, email, password, and firm ID.
5. After Supabase Auth signup, call the secure Client bootstrap function.
6. Login after verification if email confirmation is enabled.

## Seeded Pilot Setup

The repository includes seed setup for:

| Email | Role | Firm |
| --- | --- | --- |
| `godadmin@caath.com` | GodAdmin | None |
| `superadmin@firm.com` | SuperAdmin | Demo Firm Ltd |
| `admin@firm.com` | Admin | Demo Firm Ltd |
| `staff@firm.com` | Staff | Demo Firm Ltd |
| `client@firm.com` | Client | Demo Firm Ltd |

These are not automatically active unless the matching Supabase Auth users are created first and `supabase/seed.sql` is run.

## Pilot Safety Checklist

| Check | Required |
| --- | --- |
| RLS remains enabled on `public.users` | Yes |
| Public signup creates privileged users | No |
| Client signup requires firm ID | Yes |
| First firm user is SuperAdmin | Yes |
| Admin and Staff are provisioned internally | Yes |
| Client bootstrap is server-side or tightly scoped | Yes |

