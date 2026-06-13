# SaaS Administration Readiness

Date: 2026-06-04

## Scope

Validate GodAdmin readiness for plans, activation, tenant management, usage monitoring, and billing hooks.

## Readiness Matrix

| Capability | Status | Notes |
|---|---|---|
| Firm creation | Partial | GodAdmin firm operations exist; real provisioning flow must be validated in staging |
| Tenant management | Partial | Firm-scoped services exist; RLS validation remains P0 |
| Subscription plans | Partial | Plan concepts exist; commercial billing integration must be verified |
| Activation flow | Partial | Onboarding modal and account creation exist; firm pilot activation checklist needed |
| Usage monitoring | Partial | GodAdmin usage modules exist; metric lineage must be verified |
| Billing hooks | Partial | Billing routes/services exist; payment provider hooks are not confirmed |
| System notices | Partial | GodAdmin system notices UI exists; delivery/read-state must be tested |
| Support oversight | Partial | Ticket domain exists through support services and enterprise activity timeline |

## Subscription Plan Baseline

Recommended pilot plans:

- Pilot Trial: limited users, limited clients, support included.
- Professional: core CA workflows.
- Enterprise: advanced governance, audit, multi-team workflows, priority support.

## Activation Flow

1. Create firm.
2. Assign SuperAdmin.
3. Set subscription status.
4. Provision workspace.
5. Invite users.
6. Enable pilot modules.
7. Validate first client and first task.
8. Confirm support channel.

## P0 Gaps

| Gap | Required closure |
|---|---|
| RLS and tenant isolation tests | Automated tests across firm/user/client/task/document/GST records |
| Plan enforcement | Verify features are gated by subscription where commercial terms require |
| Billing event lifecycle | Invoice/payment status should update firm subscription state |

## P1 Gaps

| Gap | Required closure |
|---|---|
| Usage metering | Define billable units: users, clients, filings, storage, AI usage |
| Trial-to-paid conversion | Define operational handoff and payment trigger |
| Admin audit exports | Provide GodAdmin export for firm status and support history |
