# CAATH Seeded Users Report

Generated: 2026-06-04

## Summary

Seeded/demo identities are documented in Supabase seed files, but no usable plaintext passwords were found in the active frontend or seed scripts. The seed workflow requires creating Supabase Auth users separately with strong environment-specific passwords.

## Seeded Identities

| Email | Role | Name | Firm | Source |
|---|---|---|---|---|
| `godadmin@caath.com` | `GodAdmin` | God Admin | None | `supabase/seed.sql`, `supabase/README.md` |
| `superadmin@firm.com` | `SuperAdmin` | Super Admin | Demo Firm Ltd | `supabase/seed.sql`, `supabase/README.md` |
| `admin@firm.com` | `Admin` | Admin User | Demo Firm Ltd | `supabase/seed.sql`, `supabase/README.md` |
| `staff@firm.com` | `Staff` | Staff Member | Demo Firm Ltd | `supabase/seed.sql` |
| `client@firm.com` | `Client` | Client User | Demo Firm Ltd | `supabase/seed.sql` |

## Password Findings

| Finding | Status |
|---|---|
| Hardcoded usable seed passwords | Not found |
| Redacted seed password placeholders | Found: `<REDACTED_STRONG_PASSWORD>` |
| Frontend demo credentials | Not active; `devUsers` is empty |
| Client-side seed creation | Disabled |

## Seed Workflow Notes

`supabase/seed.sql` instructs operators to first create Supabase Auth users through Dashboard or CLI, then run SQL to create or update matching `public.users` rows. The SQL profile rows select `auth.users.id` by email.

The seeded email addresses are usable only if those auth users have actually been created in the connected Supabase project.

## Production Guidance

- Do not use the documented seed emails for a paying customer tenant unless passwords are unique, strong, and environment-scoped.
- Do not expose seed identities in production UI.
- Rotate or remove seed identities before production launch.
- Prefer named real pilot users with audited roles.

