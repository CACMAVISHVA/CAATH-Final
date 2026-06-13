# CAATH RLS Audit Report (Phase 2)

Date: 2026-05-23
Scope: Supabase schema + migrations

## Summary
- Core multi-tenant tables already had RLS in base schema.
- Phase 1 added RLS to `portal_credentials` and `portal_audit_logs`.
- Phase 2 added missing RLS coverage for GST and workforce/payroll tables and introduced `security_rate_limits` deny-by-default policy.

## Table-by-Table Findings

### Covered with RLS + tenant/role policy
- `firms`
- `users`
- `subscriptions`
- `clients`
- `client_contacts`
- `tasks`
- `approval_tasks`
- `documents` (plus restrictive tenant guardrail added)
- `approvals`
- `compliance_tasks`
- `notices`
- `billing` (plus restrictive tenant guardrail added)
- `workflows`
- `notifications`
- `audit_logs` (plus restrictive tenant guardrail added)
- `client_portals`
- `reminders`
- `portal_credentials` (Phase 1)
- `portal_audit_logs` (Phase 1)
- `gst_invoices` (Phase 2)
- `gstr_filings` (Phase 2)
- `gst_reconciliations` (Phase 2)
- `gst_mismatches` (Phase 2, via reconciliation tenant join)
- `security_rate_limits` (Phase 2, deny client access)
- `workforce_profiles` (Phase 2 if table exists)
- `salary_structures` (Phase 2 if table exists)
- `payroll_runs` (Phase 2 if table exists)
- `payroll_approval_logs` (Phase 2 if table exists)
- `compensation_change_history` (Phase 2 if table exists)

### Conditional/optional table handling
- `tickets` policy added conditionally in Phase 1 if table exists.
- `gst_modules` policy added conditionally in Phase 1 if table exists.

## Policy Weaknesses Identified
1. Mixed use of helper functions (`current_user_firm_id`) and JWT claim checks
- Impact: policy model inconsistency across schema/migrations.
- Recommendation: standardize to JWT claim-based tenant checks for predictability.

2. Some policies are broad `FOR ALL` with role checks
- Impact: correctness depends on role derivation integrity.
- Recommendation: keep restrictive tenant policy layers (already started for key tables), and add explicit action-level policies where possible.

3. Legacy views/functions
- Materialized views and helper functions aggregate data; access controls should be reviewed if exposed directly to clients.

## Privilege Escalation Review
- Direct cross-tenant read/write blocked by tenant policies and restrictive overlays for key tables.
- `GodAdmin` bypass remains explicit and isolated by role condition.
- No public read policy was introduced in Phase 1/2 changes.

## Recommended Indexes
Added:
- `idx_security_rate_limits_scope_actor_window`
- `idx_portal_credentials_firm_id`
- `idx_portal_credentials_portal_name`
- `idx_portal_credentials_created_by`
- `idx_portal_audit_logs_client_ts`
- `idx_portal_audit_logs_portal_type`

Recommended next:
- `audit_logs(tenant_id, created_at desc)` for expanded security monitoring queries
- `portal_credentials(firm_id, portal_type)` for faster filtered launch views
- `gst_reconciliations(firm_id, period)` for tenant-period analysis

## Conclusion
- RLS posture is now substantially stronger and closer to enterprise multi-tenant baseline.
- Residual work is mostly consistency hardening and policy test automation rather than foundational gaps.
