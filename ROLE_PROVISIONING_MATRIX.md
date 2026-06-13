# CAATH Role Provisioning Matrix

## Role Creation Rules

| Target Role | Public Create Account | Created By | Current Provisioning Method | Requires Firm ID | Notes |
| --- | --- | --- | --- | --- | --- |
| GodAdmin | No | Manual platform setup / seed | Create Supabase Auth user, then seed or insert `public.users` row with role `GodAdmin` | No | GodAdmin has `firm_id = null` |
| SuperAdmin | No | GodAdmin | GodAdmin Provisioning -> Role Activation after Supabase Auth user exists | Yes | First firm owner is activated as SuperAdmin |
| Admin | No | GodAdmin or SuperAdmin policy | Role Activation after Supabase Auth user exists | Yes | `accountOnboardingService` allows SuperAdmin actor to create Admin, but no audited public UI passes a SuperAdmin actor |
| Staff | No | GodAdmin, SuperAdmin, or Admin policy | Role Activation after Supabase Auth user exists | Yes | Staff Management UI is mock/local only |
| Client | Yes | Public signup, SuperAdmin, or Admin policy | Public Create Account or Role Activation | Yes | Public signup should include valid Firm ID |

## Actor Capability Matrix

| Actor Role | Can Create SuperAdmin | Can Create Admin | Can Create Staff | Can Create Client | Implementation |
| --- | --- | --- | --- | --- | --- |
| Anonymous | No | No | No | Yes | `createAccountWithRole(actor: null)` |
| GodAdmin | Via firm provisioning activation | Via role activation | Via role activation | Via role activation | `activateProvisionedUser` |
| SuperAdmin | No via signup helper | Yes | Yes | Yes | `canCreateRole` policy |
| Admin | No | No | Yes | Yes | `canCreateRole` policy |
| Staff | No | No | No | No | `canCreateRole` policy |
| Client | No | No | No | No | `canCreateRole` policy |

## Current UI Surfaces

| Surface | Audience | Roles It Can Really Provision | Notes |
| --- | --- | --- | --- |
| Public Create Account | Anonymous users | Client only | Dropdown currently shows blocked roles |
| GodAdmin Platform Control Tower -> Provisioning | GodAdmin | Firm package, SuperAdmin/Admin/Staff/Client profile activation | Requires external Supabase Auth user ID |
| Staff Management | SuperAdmin | None persistently | Uses mock data and local component state only |
| Supabase Dashboard / CLI | Platform operator | Auth identities for any role | Must be paired with CAATH `public.users` profile |

## Role Access After Provisioning

| Role | Default Home | Main Access |
| --- | --- | --- |
| GodAdmin | Platform | Platform control, firms, provisioning, subscriptions, audit, usage, notices, settings |
| SuperAdmin | Workspace | Firm workspace, billing, staff, security, full operational modules |
| Admin | Workspace | Firm workspace and operational modules except owner-only areas like billing/staff/security |
| Staff | Workspace | Assigned operational work: tasks, clients, compliance, GST, documents, notices, notifications, payroll |
| Client | Overview | Client portal overview, documents, messages, compliance |

## Pilot Recommendation

For public signup, lock Profile Type to Client and require Firm ID. Keep SuperAdmin/Admin/Staff creation inside controlled provisioning.

