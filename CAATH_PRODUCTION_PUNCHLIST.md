# CAATH Production Punchlist

Date: 2026-06-04

## P0 - Must Fix Before First Client

| Item | Owner area | Acceptance criteria |
|---|---|---|
| Fix TypeScript lint failures | Engineering | `npm run lint` passes with zero errors |
| Resolve Manager role decision | Product/Engineering | Manager is either mapped to Admin or implemented intentionally across types, permissions, routing, UI |
| Validate tenant isolation | Security/Data | Staff, Client, Admin, SuperAdmin, GodAdmin queries cannot leak cross-tenant data |
| Validate Client Management CRUD | Product/Engineering | Create/edit/assign/archive client persists and shows success/error feedback |
| Validate Task Management lifecycle | Product/Engineering | Create/assign/reassign/complete task persists and emits audit/event feedback |
| Validate GST core workflow | GST/Product | Import/reconcile/resolve flow works with real data and no type errors |
| Validate Compliance lifecycle | Product | Create/update/file compliance item persists and updates relevant views |
| Remove fake production metrics | Product/UI | Every dashboard/analytics metric has live source or empty state |
| Standardize action feedback | UI Platform | All visible actions show loading/success/error or clear navigation result |
| Validate client portal permissions | Security/Product | Client sees only approved/visible documents and own compliance context |

## P1 - Fix Before Scale

| Item | Owner area | Acceptance criteria |
|---|---|---|
| Wire Operations drawer to live data | Product/UI | Drawer shows real task/notice/approval signals or only action shortcuts |
| Add route-level error/empty states | UI Platform | All major routes handle no-data and failure states |
| Add workflow test suite | QA/Engineering | Automated tests cover auth, roles, clients, tasks, GST, compliance, documents |
| Data lineage for analytics | Analytics | Every metric documents source table/service and refresh behavior |
| Governance audit completion | Governance | Approval and task changes create auditable records |
| Notification delivery/read-state validation | Notifications | Workflow event creates notification, user can read/clear it |
| Supabase RLS verification | Security | RLS policies tested for all major tables |

## P2 - Future Enhancement

| Item | Rationale |
|---|---|
| Promote AI Copilot back into primary nav only after live action value is proven | Avoid decorative AI |
| Reintroduce utility rail only if telemetry proves it improves speed | Avoid permanent screen clutter |
| Expand learning/playbook surfaces | Useful after production workflows are stable |
| Advanced automation/autonomous operations | Scale feature after core deployment |
| Executive dashboard polish | Do after metrics are live and trusted |

## First Client Recommendation

Run a 30-day pilot only after P0 completion with a limited workflow scope:

- firm setup
- user/staff setup
- client onboarding
- task execution
- document vault
- compliance tracking
- GST reconciliation
- approvals/governance
