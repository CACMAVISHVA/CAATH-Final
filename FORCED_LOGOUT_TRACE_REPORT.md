# Forced Logout Trace Report

## Exact logout trigger

The Supabase network request `logout?scope=global` is created only when the frontend calls:

- `src/domains/auth/repositories/SupabaseAuthRepository.ts:16`
  - `supabase.auth.signOut()`

Current upstream callers:

- `src/App.tsx:221`
  - explicit sidebar/UI logout handler calls `logout()`.
- `src/context/AuthContext.tsx:201`
  - explicit auth context logout wrapper calls `authService.logout(...)`.
- `src/domains/auth/services/authService.ts:37-38`
  - OTP-required login handoff signs out the password session before email OTP verification.
- `src/domains/auth/services/authService.ts:136-137`
  - explicit logout calls the auth repository sign-out.

No direct code path was found where a failed dashboard table request calls `signOut()`.

## Why missing tables looked like auth logout

The missing optional module tables:

- `enterprise_activities`
- `document_vault`
- `invoices`
- `payroll_runs`
- `task_reassignments`

were used by dashboard and enterprise intelligence services that still had fail-fast `Promise.all()` calls or threw immediately when a Supabase table returned 404. Those failures could interrupt dashboard bootstrap and make the authenticated shell appear to collapse. The actual `logout?scope=global` request still requires one of the sign-out callers above.

## Changes made

The initialization flow was hardened so optional module failures degrade to empty datasets and warning logs:

- `src/services/revenueIntelligenceService.ts`
  - `invoices` and receivables summary failures now return empty revenue data.
- `src/services/enterpriseFinancialIntelligenceService.ts`
  - `invoices`, `payroll_runs`, `expenses`, and related financial feeds now degrade to empty arrays.
- `src/services/enterpriseRelationshipEngine.ts`
  - `task_reassignments` and knowledge graph failures no longer break the relationship snapshot.
- `src/services/clientPortalCollaborationService.ts`
  - `invoices`, `document_vault`, and `enterprise_activities` failures now produce empty portal sections.
- `src/services/documents/documentIntelligenceDashboardService.ts`
  - `document_vault` failures now return a neutral document intelligence summary.
- `src/services/predictiveOperationalIntelligenceService.ts`
  - `payroll_runs`, `task_reassignments`, document intelligence, revenue intelligence, and telemetry failures now return neutral predictive signals.
- `src/services/notificationRuntimeService.ts`
  - `document_vault` failures no longer prevent notification generation.
- `src/services/operationalTelemetryPipelineService.ts`
  - `enterprise_activities` insert/read failures are warning-only.
- `src/services/enterpriseEventBusService.ts`
  - `enterprise_activities` event publishing/history failures are warning-only.
- `src/services/enterpriseIntegrationOrchestrationService.ts`
  - `enterprise_activities` integration orchestration failures are warning-only.

## Verification

- `npm run lint` passed.
- `npm run build` passed.

## Remaining production action

The database still needs the missing enterprise tables applied. The frontend now tolerates their absence, but the enterprise widgets will show neutral/empty state until the production schema is synchronized.

## Hosted account-disablement test — 12 September 2026

The hosted test confirmed that deactivation persists, but the inactive user's next workspace load previously showed a misleading profile-missing state. The frontend now detects an inactive profile, clears the workspace session, and performs a global Supabase sign-out. Staff Management now supports governed reactivation and continues to block self-deactivation.

Migration `20260912042715_allow_inactive_user_self_status.sql` adds a least-privilege self-select policy so an authenticated user can read only their own status long enough for CAATH to enforce the sign-out. It was applied to the linked CAATH Supabase project and the policy was verified live.

The final hosted test passed: after a Super Admin deactivated the controlled Staff identity, the Staff session returned to Sign In with the explicit inactive-account message. The dummy Staff identity was then restored to Active. The remote migration ledger still contains four versions that are absent locally, so migration-history repair was deliberately not attempted and must be reconciled before the next schema batch.
