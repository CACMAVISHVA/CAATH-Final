# CAATH Database Reconciliation Report

Date: 2026-06-16

## Scope

Audited Supabase usage across `src/`, `supabase/schema.sql`, and `supabase/migrations/`. The reconciliation is additive and forward-only: no historical migrations were edited and no destructive schema changes were introduced.

## Referenced Tables and Views

Application code references these Supabase relations:

- `approval_tasks`
- `audit_logs`
- `auth_security_settings`
- `automation_runs`
- `clients`
- `compensation_change_history`
- `compliance_tasks`
- `document_audit_logs`
- `document_vault`
- `enterprise_activities`
- `expenses`
- `filings`
- `firms`
- `gst_invoices`
- `gst_mismatches`
- `gst_reconciliations`
- `gstr1_data`
- `gstr3b_data`
- `gstr_filings`
- `invoice_payments`
- `invoices`
- `login_activity`
- `notices`
- `notifications`
- `payroll_runs`
- `portal_audit_logs`
- `purchase_register`
- `reminders`
- `salary_structures`
- `subscriptions`
- `support_tickets`
- `task_activities`
- `task_comments`
- `task_reassignments`
- `tasks`
- `trusted_devices`
- `users`

Dynamic or indirect repository calls were also reviewed. `godAdminPlatformSegmentationService` uses dynamic table names for platform counts; the resolved dashboard inputs are `firms` and `subscriptions`.

## Referenced RPC and Functions

Application code references this RPC:

- `gst_monthly_tax_trends`

Schema/helper functions used by RLS and services:

- `current_user_profile_id`
- `current_user_firm_id`
- `current_user_role`
- `get_subscription_features`
- `has_feature`
- `is_god_admin`
- `is_subscription_active`

Audit maintenance functions present in the master schema:

- `refresh_audit_materialized_views`
- `safe_refresh_audit_materialized_views`
- `get_last_audit_refresh`
- `get_recent_failed_refreshes`
- `is_audit_refresh_stale`
- `get_long_running_refresh_runs`
- `get_audit_aggregation_latency_stats`
- `get_portal_failure_spikes`
- `get_action_spike_candidates`
- `metrics_audit_overview`

## Referenced Storage Buckets

- `documents`

The reconciliation migration ensures this bucket exists in `storage.buckets`.

## Existing Schema Objects

Defined in `supabase/schema.sql`:

- Tables: `firms`, `users`, `subscriptions`, `clients`, `client_contacts`, `tasks`, `task_activities`, `task_comments`, `task_reassignments`, `enterprise_activities`, `automation_runs`, `approval_tasks`, `documents`, `approvals`, `compliance_tasks`, `notices`, `billing`, `workflows`, `notifications`, `audit_logs`, `gst_invoices`, `gstr_filings`, `gst_reconciliations`, `gst_mismatches`, `client_portals`, `reminders`, `audit_refresh_runs`
- Materialized views: `audit_activity_counts`, `audit_action_summary`, `user_activity_30d`, `recent_audit_events`
- RPC/functions: listed above

Defined in existing migrations:

- `workforce_profiles`
- `salary_structures`
- `payroll_runs`
- `payroll_approval_logs`
- `compensation_change_history`
- `portal_credentials`
- `portal_audit_logs`
- `security_rate_limits`
- `auth_security_settings`
- `login_activity`
- `trusted_devices`
- `auth_sessions`

## Missing Objects Found

These app-referenced objects were missing from the current SQL definition and are created by `supabase/migrations/20260618_schema_reconciliation.sql`:

- `document_vault`
- `document_audit_logs`
- `invoices`
- `invoice_payments`
- `expenses`
- `support_tickets`
- `gstr1_data`
- `gstr3b_data`
- `purchase_register`
- `filings` compatibility view
- `documents` storage bucket bootstrap

## Column and Naming Mismatches

- `documents` vs `document_vault`: `documents` is the legacy workflow review table; the app's vault services need versioning, soft delete, link fields, file metadata, tags, and audit history. The migration creates `document_vault` and backfills compatible rows from `documents`.
- `billing` vs `invoices`: `billing` stores simple amount/status rows; invoice modules require tax breakdowns, line items, payment state, and invoice lifecycle fields. The migration creates `invoices` and backfills simple invoice rows from `billing`.
- `gstr_filings` vs `filings`: global search expects a `filings` relation. The migration creates a security-invoker compatibility view over `gstr_filings`.
- `subscriptions`: the service layer expects `start_date`, `end_date`, `next_billing_date`, limits, auto-renew, and payment metadata. The migration adds these columns and backfills from existing date columns where available.
- GST source tables: the GST repository expects `gstr1_data`, `gstr3b_data`, and `purchase_register` for period-level reconciliation inputs. The migration creates these additive source tables.

## Changes Applied

- Added `supabase/migrations/20260618_schema_reconciliation.sql`.
- Added missing write tables with primary keys, foreign keys, check constraints, indexes, and tenant-scoped RLS policies.
- Added `filings` compatibility view over `gstr_filings`.
- Added subscription-service compatibility columns and backfilled them from existing subscription dates.
- Backfilled `document_vault` from existing `documents`.
- Backfilled `invoices` from existing `billing`.
- Ensured the `documents` storage bucket exists.
- Updated `src/context/AuthContext.tsx` so profile initialization errors do not clear an otherwise valid Supabase session.

## User Hierarchy Verification

Existing migrations already encode the requested hierarchy through `users_workspace_role_insert`:

- God Admin can create workspace users.
- Super Admin can create Admin, Staff, and Client users.
- Admin can create Staff and Client users.
- Staff can create Client users only.
- Workspace owner bootstrap remains narrow through `users_self_workspace_owner_insert`.

The reconciliation migration does not loosen these policies. It keeps new operational modules tenant-scoped through `current_user_firm_id()` and `is_god_admin()`.

## Subscription Access Notes

The frontend computes `subscriptionLocked` from `user.firm.subscriptionStatus`. Inactive workspaces can be blocked at route/module level while billing/payment screens remain accessible. This report did not add a new route gate; it preserved the current frontend behavior and added the missing database columns required for subscription and billing screens to load.

## Remaining Manual Actions

- Apply the new migration to the connected Supabase project.
- Refresh PostgREST schema cache after migration if Supabase does not reload it automatically.
- Confirm production storage policies for the `documents` bucket. The migration creates the bucket, but bucket-level object policies may still need environment-specific hardening.
- Run a live smoke test after deployment: login, dashboard bootstrap, Document Vault list/upload, Billing invoice list, GST dashboard, Global Search filings.
