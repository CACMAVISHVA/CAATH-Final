# CAATH competitor gap audit — 23 October 2026

Baseline: main 9c28e5903b2dfded39a8e37b6327174b548fdd34; read-only inspection of CAATH PRACTICE OS. “Existing” means code and matching schema were found, not that every end-to-end flow has passed UAT. “Partial” includes code/schema drift. Prior chat assistant text could not be recovered (reference placeholders); its two screenshots were reviewed. See RECOVERED_REQUIREMENTS.md for recovered chats and older implementations of GST Practice Hub, lifecycle, GSP, accounting and template modules absent from this baseline. Reuse assessment is required. All-chat coverage remains incomplete pending older-chat access.

| Capability / source | Before | Evidence and gap | Priority / phase |
|---|---|---|---|
| Multi-client notice register / TaxBotGPT | Partial | NoticeCenter, noticeDomainService, notices exist. Creation sends missing description; optional fields conflict with NOT NULL. | P0 / 1 |
| Notice-to-task workflow | Partial | Existing marker-based task links; separate writes can leave orphan notices. Assignment/status service functions are not exposed by current UI. | P0 / 1 |
| Deadline monitoring / alerts | Partial | Notice statistics and notification modules exist. Same-day dates excluded; no dedicated triage filter. No reliable scheduled external delivery verified. | P1 / 1 triage; 2 delivery |
| GST portal monitoring / TaxBotGPT | Partial | Live gst_gsp_connections and gst_gsp_sync_jobs exist, consent includes notices.read. No matching repository consumer/provider adapter found. Do not create competing connection/job tables. | P1 / 2, provider contract required |
| AI-assisted replies / TaxBotGPT | Missing | reply_draft column exists but no notice drafting UI/provider route. Existing document AI puts a Gemini key in a browser build: unsuitable for tax replies. | P1 / 1 manual drafting foundation; 2 server AI |
| Case progress / TaxBotGPT | Partial | Notice status enum/service exists; no case editing or history UI. | P1 / 1 |
| Appeals, litigation, hearings / TaxBotGPT screenshot | Partial | Production gst_litigation_cases has forum, stage, hearing/due dates and disputed amount. Repository only references “litigation-defense-mode” analysis, not CRUD for this table. | P1 / 2, reuse table |
| Reconciliation / TaxBotGPT | Partial | GSTIntelligenceCenter, parsing and reconciliation engines exist; repository GST persistence refers to tables absent from current public inventory. Validate persistence before adding analytics. | P1 / 2 |
| Lead-to-client CRM / CaThrives | Missing | Client Master exists; no lead table or pipeline found. | P1 / 1: follow-ups and conversion to existing client |
| Client management / CaThrives | Existing | ClientMaster, clientDomainService, clients, contacts and portal links. Preserve registry, PAN validation and onboarding. | Reuse |
| GST tracking / CaThrives | Partial | GST UI plus production return profiles/status/workpapers; repository contracts differ. | P1 / 2 |
| ITR / ROC tracking / CaThrives | Partial | ComplianceTracker, clientComplianceService, compliance_tasks and category support exist. Validate real records and remove placeholder summaries. | P1 / 2 |
| Tasks / CaThrives | Existing | TaskBoard, task domain/repository, tasks and activity/reassignment tables. Reuse for notices; address cross-record tenant validation in later hardening. | P1 / 1 reuse |
| Billing / CaThrives | Partial | BillingRevenue and billing table exist. invoice services query invoice tables absent from live inventory; subscription billing is separate and must not be conflated. | P1 / 3 reconciliation |
| HR / staff operations / CaThrives | Partial | StaffManagement and users exist. PayrollWorkspace/workforce services exist but workforce_profiles/payroll_runs absent live; workforce writes swallow failures and return fake IDs. | P1 / 3 |
| Timesheets / CaThrives | Partial | Production time_entries exists; no repository timesheet surface found. Staff can update status without approval-specific restriction. | P2 / 3 reuse table |
| Documents / CaThrives | Existing | DocumentVault/services plus document_vault/documents, including linked_notice_id. Reuse uploads and notice linkage; storage policy E2E still required. | P2 / 2 linkage |
| Automation / CaThrives | Partial | AutomationCenter, workflow orchestration, workflows and runtime code exist. Production job execution, durable retries and delivery not established by this audit. | P2 / 3 |
| Access control and tenant isolation | Partial | All 52 public tables have RLS. notices_scope allows Client writes with only firm check; notification policy permits broad writes; litigation read is firm-wide including clients. | P0 / 1 notices; separate hardening for other domains |

## Phase boundaries and acceptance

1. Notice reliability and CRM: additive migration, preview only; manual intake creates one task atomically and retries safely; tenant checks; case updates, drafts, acknowledgement recording; India-date triage; lead pipeline/follow-ups and linkage to Client Master. New UI/RPC paths gated by VITE_NOTICE_INTELLIGENCE. No filing or portal login.
2. Notice provider + AI: validate consent, provider sandbox, auth/OTP/session contracts, webhook signature, external identifiers, idempotency, rate limits, secrets, deadline extraction confidence and professional review; reuse GSP jobs/connections. Reconcile existing GST storage contracts; connect litigation and document modules. No provider success simulated.
3. Practice operations: reconcile billing/HR schema and services, remove fake-success fallbacks, wire existing time_entries with approval guards, durable alert outbox and automation, then end-to-end regressions.

## Security and environment findings

- Production reads only; no data copied to preview. A schema-only preview bootstrap was needed because the existing migration chain failed from an empty database. The repository schema.sql starts with destructive drops and forward foreign keys: do not run it against production.
- Supabase advisors identify 12 authenticated SECURITY DEFINER functions. This is a review signal, not proof each is vulnerable. Existing tenant helpers intentionally bypass users RLS to avoid recursion. New business RPCs use SECURITY INVOKER and explicit tenant/role checks.
- portal_credentials has RLS with no policies; likely service-only by design. Do not open browser access to fix this advisory.
- Existing Vite configuration embeds GEMINI_API_KEY. Do not provision a production key for this build. Server-side AI migration remains a prerequisite.
- The six baseline subscription/billing type errors have been corrected on this branch; type-check now passes.
- Read Supabase RLS documentation: https://supabase.com/docs/guides/database/postgres/row-level-security and advisor guidance: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Required deployment order

Approve and test the additive migration in a non-production environment, then enable the feature flag there. Before any production release, review direct Data API write guards, run role/tenant regression tests, resolve remaining baseline defects and approve the migration and application deployment explicitly. Keep the flag false on production until then. Rollback UI by disabling the flag; preserve additive columns/data. Do not drop case history or leads to roll back an application build.
