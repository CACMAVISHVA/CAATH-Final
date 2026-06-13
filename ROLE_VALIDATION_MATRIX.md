# CAATH Role Validation Matrix

Date: 2026-06-04

## Role Model

Current implemented roles:

- GodAdmin
- SuperAdmin
- Admin
- Staff
- Client

Requested but not implemented:

- Manager

## Validation Matrix

| Role | Implemented | Home route | Access model | Validation status | Notes |
|---|---|---|---|---|---|
| God Admin | Yes | `platform` | Platform-only routes: firms, usage, subscriptions, global audit, settings | PARTIAL | Needs real firm and subscription workflow tests |
| Super Admin | Yes | `workspace` | Full firm operations including billing, staff, audit, security, QA | PARTIAL | Broad access exists; workflows need CRUD completion tests |
| Admin | Yes | `workspace` | Firm operations excluding billing/staff/security | PARTIAL | Good model; validate approvals, GST, compliance, task execution |
| Manager | No | None | None | BLOCKED | Not present in `UserRole`; map to Admin or add intentionally after requirements |
| Staff | Yes | `workspace` | Execution routes: tasks, clients, compliance, GST, documents, notices, payroll | PARTIAL | Need assigned-client scoping validation |
| Client | Yes | `overview` | Client portal overview, documents, messages, compliance | PARTIAL | Need client-visible data and document permission tests |

## Role Risks

| Risk | Severity |
|---|---|
| Manager role absent from type system and permissions | Critical |
| Staff assigned-client enforcement must be verified across all queries | High |
| Client portal document visibility must be verified against server-side policies | High |
| GodAdmin platform data must not leak firm tenant records without explicit scope | High |
| Admin/SuperAdmin permission differences need UI and backend enforcement tests | Medium |

## Deployment Gate

No enterprise deployment should proceed until the Manager decision is resolved and role access is tested with real accounts in Supabase.
