# Pilot Account Setup Guide

Generated: 2026-06-13

## Required Order

1. Apply `supabase/schema.sql`.
2. Apply all migrations, including `20260613_auth_onboarding_rls_stabilization.sql`.
3. Create the first GodAdmin Supabase Auth user through Dashboard/CLI.
4. Insert/seed the matching `public.users` GodAdmin profile.
5. Sign in as GodAdmin.
6. Create one Pilot Firm provisioning package.
7. Create Supabase Auth users for one SuperAdmin, one Admin, and two Staff users.
8. Activate each user in CAATH with the correct firm ID and auth user ID.
9. Give the Client user the firm workspace ID and let them self-sign up, or activate them through provisioning.
10. Validate login, logout, reset password, session restore, and role access for each account.

## Pilot Target Accounts

- 1 Pilot Firm
- 1 GodAdmin/SuperAdmin platform owner as applicable
- 1 Firm SuperAdmin
- 1 Firm Admin
- 2 Staff users
- 1 Client user

## Important Guardrail

Do not create privileged users from public signup. Use Supabase admin tooling plus CAATH role activation.
