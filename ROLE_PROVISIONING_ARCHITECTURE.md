# Role Provisioning Architecture

Generated: 2026-06-13

## Role Model

CAATH uses `public.users.role` with allowed values: `GodAdmin`, `SuperAdmin`, `Admin`, `Staff`, `Client`.

## First GodAdmin

Created outside browser runtime through Supabase admin tooling, then seeded/inserted into `public.users` with `role = 'GodAdmin'` and `firm_id = NULL`.

## First Firm Admin

GodAdmin creates a firm provisioning package in the GodAdmin UI. The Supabase Auth identity is created through Dashboard/CLI/admin tooling. The CAATH profile is activated through `activateProvisionedUser()` with firm ID, auth user ID, email, name, and role.

## Staff Accounts

SuperAdmin or GodAdmin provisions Staff by creating the Supabase Auth user through approved admin tooling, then activating the `public.users` row with `role = 'Staff'`.

## Client Accounts

Clients may self-sign up only as `Client` when they have a firm workspace ID. A privileged operator may also activate Client profiles through the provisioning workflow.

## Self-Service Roles

Only `Client` supports public self-service onboarding.

## Provisioned Roles

`GodAdmin`, `SuperAdmin`, `Admin`, and `Staff` require admin/provisioning workflows.
