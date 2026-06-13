# Firm Provisioning Guide

Generated: 2026-06-04

## P0 Closure Summary

Status: Closed for pilot UAT with secure auth-admin boundary.

CAATH now exposes a visible GodAdmin provisioning workflow under Platform Control Tower navigation.

## Visible Workflow

Navigation:

`GodAdmin -> Provisioning`

Steps:

1. Create firm package.
2. Create subscription shell.
3. Generate admin invite/provisioning instructions.
4. Create Supabase Auth user securely through approved admin tooling.
5. Paste Supabase Auth user id into Role Activation.
6. Activate user profile and workspace.

## Why Auth User Creation Is Not Browser-Based

CAATH cannot safely create privileged Supabase Auth users from browser runtime. `public.users.auth_id` must reference an existing `auth.users.id`, and creating that user securely requires Supabase Dashboard, CLI, or server-side admin tooling.

This is now visible in-product rather than hidden tribal knowledge.

## Implemented Files

| File | Role |
|---|---|
| `src/components/god-admin/FirmProvisioningPanel.tsx` | Visible GodAdmin provisioning UI. |
| `src/services/firmProvisioningService.ts` | Firm package creation and user role activation. |
| `src/components/GodAdminDashboard.tsx` | Renders Provisioning tab. |
| `src/components/Sidebar.tsx` | Adds Provisioning navigation. |
| `src/lib/permissions.ts` | Adds GodAdmin access to `provisioning`. |

## Workflow Readiness

| Workflow | Status |
|---|---|
| Create firm | PASS |
| Create subscription shell | PASS |
| Generate admin invite instructions | PASS |
| Assign role after auth user exists | PASS |
| Activate workspace | PASS |
| Securely create Supabase Auth user in browser | Intentionally not supported |

## Operator Checklist

1. Open Provisioning as GodAdmin.
2. Enter firm name, initial admin name/email, and plan.
3. Create firm package.
4. Create Supabase Auth user through Dashboard/CLI.
5. Copy the auth user id.
6. Paste firm id, auth id, name, email, and role into Role Activation.
7. Activate user.
8. Confirm the firm is Active and the admin can log in.

