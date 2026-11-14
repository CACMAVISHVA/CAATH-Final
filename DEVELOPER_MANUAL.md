# CAATH Developer Manual

Version: Release Candidate — 20 September 2026

## 1. System overview

CAATH is a multi-role React single-page application backed by Supabase and deployed as a static Vite build on Vercel.

- UI: React 19, TypeScript, React Router, Tailwind CSS, Motion, Recharts
- Build: Vite 6
- Backend: Supabase Auth, Postgres, Row Level Security, Storage, Realtime
- Hosting: Vercel
- Roles: `GodAdmin`, `SuperAdmin`, `Admin`, `Staff`, `Client`

The browser receives only the Supabase project URL and anonymous key. Authorization must be enforced by database policies and privileged server-side functions, never by UI hiding alone.

Cashfree Payment Gateway uses Vercel server functions. `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, and `CASHFREE_ENV` are server-only Vercel secrets and must never use a `VITE_` prefix. `api/cashfree-order.ts` authenticates the active Super Admin, recalculates plan totals server-side, creates the provider order, supplies `https://caath.in/api/cashfree-webhook` as the per-order `notify_url`, and verifies returned status. `api/cashfree-webhook.ts` verifies Cashfree's HMAC-SHA256 signature against the exact raw body before accepting an event. `payment_gateway_orders` is RLS-protected and writable only through the server service role. A `PAID` order creates a pending subscription request; God Admin approval remains a separate activation gate.

Migration `20260919104519_align_subscription_billing_cycles.sql` keeps request and subscription constraints aligned with every cycle offered by the UI. Migration `20260919104712_repair_subscription_payment_artifacts.sql` restores the private payment-proof fields, bucket policies and invoice-cycle constraints required by manual and gateway flows. The signed webhook regression is `work/test-cashfree-success.mjs`; it must prove `PAID`, provider payment ID, pending God Admin approval and both role notifications. `work/test-cashfree-database-workflow.mjs` isolates the database portion when diagnosing a provider delivery failure.

Client accounting add-on requests are stored in `accounting_addon_workspaces`. RLS allows firm members to read only their firm's rows; only a Super Admin can create a `Pending` request for a client in the same firm; only God Admin can activate, decline, suspend or set price. No ledger or voucher feature should bypass this activation gate. Template Studio uses the pinned `docx` package and generates files entirely in the browser; form values are not persisted.

The GST Practice Hub uses `gst_return_statuses` and `gst_client_authorizations` from migration `20260920150000_gst_practice_hub.sql`. The tables are firm-isolated by RLS. Status writes are limited to Super Admin, Admin and Staff; authorization changes are limited to Super Admin and Admin. CSV/XLSX reconciliation is browser-local through `gstPracticeHubService.ts`; never add a raw-file upload without a separate security, retention and consent review. Official return retrieval must stay visibly disabled until an approved GSP is connected and tested.

## 2. Repository map

- `src/App.tsx` — authenticated application shell and module routing
- `src/components/` — product screens and shared UI
- `src/context/AuthContext.tsx` — session and profile lifecycle
- `src/routes/ProtectedRoute.tsx` — UI route permission boundary
- `src/lib/permissions.ts` — central permission definitions
- `src/domains/` — domain orchestration and repositories
- `src/services/` — application services and Supabase access
- `supabase/schema.sql` — consolidated schema reference
- `supabase/migrations/` — ordered database changes
- `vercel.json` — deployment, SPA rewrites, caching, and response headers
- `public/` — static and branding assets

## 3. Local setup

Requirements: Node.js 20 or newer, npm, and access to the intended Supabase project.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Leave `VITE_CAATH_EMAIL_OTP_ENABLED=false` unless verified email delivery is configured.
5. Start the app with `npm run dev` and open `http://localhost:3000`.

Never commit `.env`, `.env.local`, `.vercel`, database passwords, service-role keys, access tokens, or customer data.

## 4. Validation commands

- `npm run lint` — TypeScript validation
- `npm run build` — optimized production build
- `npm run preflight` — required TypeScript and build gate
- `npm audit --omit=dev` — dependency review

The current low-severity `esbuild` advisory concerns the Windows development server. It does not affect the generated static production bundle, but should be removed when the upstream Vite dependency range permits a safe upgrade.

## 5. Authentication and authorization

Supabase Auth owns credentials and sessions. CAATH loads the application profile from the `users` table and combines it with firm and subscription context.

Authorization layers:

1. Sidebar visibility controls discoverability.
2. `ProtectedRoute` prevents a disallowed role from rendering a module.
3. Service queries scope records by firm/client.
4. Postgres Row Level Security is the final data boundary.

Every new table or function must be reviewed for anonymous access, firm isolation, client isolation, least-privilege writes, explicit God Admin authority, sensitive-action auditing, and safe `SECURITY DEFINER` ownership, `search_path`, and execute grants. A hidden button is never an authorization control.

Firm suspension is enforced below the UI. Migration `20260913122329_add_firm_suspension_audit_fields.sql` adds the reason/actor/timestamp fields. Migration `20260913125406_add_suspension_grace_period.sql` adds the effective date and mode. `current_user_firm_id()` continues returning the tenant ID while a suspended firm is inside its 30-day grace period, but returns `NULL` once the effective date is reached or for an immediate security suspension; tenant-scoped RLS policies then deny data access. Suspension does not delete records. God Admin remains available for reactivation. In `firms`, `updated_by` references `auth.users.id`, while `suspended_by` and `reactivated_by` reference `public.users.id`; do not interchange these identifiers. PostgREST embeds from `users` to `firms` must name `users_fk_firm` because the audit foreign keys create additional relationships.

Migration `20260919103654_enforce_immediate_security_suspension.sql` makes `Immediate Security` unconditional, so access never depends on browser/server clock alignment. The UI uses the same explicit mode check before displaying a grace-period warning.

## 6. Database changes

Create forward-only SQL migrations in `supabase/migrations/` using a timestamped filename. A migration should be idempotent where practical, explicitly enable RLS, define policies/grants, and document destructive changes.

Before applying a migration:

1. Create a CAATH backup.
2. Confirm the exact target project.
3. Test against dummy data.
4. Check Security Advisor and policy inventory.
5. Apply to preview first.
6. Run role and tenant-isolation checks.

Do not edit a historic applied migration to change live behavior. Add a corrective migration.

## 7. Storage

Documents use the Supabase `documents` bucket. Application records store object paths; reads should use short-lived signed URLs. Do not persist permanent public URLs for private documents. Deletes must coordinate storage removal, metadata state, authorization, and audit history.

Treat storage upload plus metadata persistence as the durable upload boundary. A later telemetry or notification failure must not turn that completed upload into a false failure. If metadata persistence fails after object upload, make a best-effort removal of the orphaned object. Client-specific Archived and Trash queries must retain the selected-client filter.

GST validation artifacts are stored in `enterprise_activities`, including the final `analysis_execution` record, and the latest completed artifact must hydrate after reload. Normalize stored return periods to `YYYY-MM`. Missing optional legacy GST read tables may degrade to neutral empty results, but required artifact-persistence failures must remain visible and actionable.

Audit events require `audit_logs.severity` with the constrained values `info`, `warning`, or `critical`; existing rows default to `info`. Standard audit-query errors must be thrown and shown to the user. `portal_audit_logs` is an optional integration source and may degrade to an empty portal stream only when the table is genuinely absent from Postgres/PostgREST.

## 8. Regulatory content

Incoming regulatory updates remain non-public until God Admin verification. Publishing must be atomic, auditable, and visible only to intended Super Admin audiences. The official source and effective date are mandatory evidence. Generated summaries must not be represented as legal advice.

## 9. Deployment

The Vercel project is the existing `caath` project. Browser-safe variables use the `VITE_` prefix. Supabase service-role, cron and Cashfree credentials are server-only secrets. Cashfree sandbox is selected with `CASHFREE_ENV=sandbox`; change to `production` only after Cashfree KYC approval, production keys, `caath.in` domain whitelisting, registered webhook verification and a controlled low-value live payment.

1. Run `npm run preflight`.
2. Confirm no secrets or real data are present.
3. Deploy to a protected preview.
4. Verify `/` and a nested path such as `/settings/subscription`.
5. Test sign-in, recovery UI, registration UI, role landing pages, logout, and denied routes.
6. Test core persistence using dummy accounts.
7. Promote only after the release gate is signed off.

`vercel.json` provides SPA fallback routing, defensive headers, and immutable caching for fingerprinted assets. Preview and production are separate stages; do not change the production alias casually.

### Government Portal Login Desk

`src/components/GovernmentPortalHub.tsx` renders the client-first launch table. `src/services/governmentPortalService.ts` is the single registry for portal names, identifiers, and official destinations. Keep destinations limited to verified government-owned domains and review them before each release.

The launch flow records portal type, client context, user context, and action metadata through the existing audit service, then opens the official website in a separate tab. It deliberately does not accept, store, retrieve, or auto-fill portal usernames, passwords, OTPs, or CAPTCHAs. Credential-vault work, if ever approved, must be designed as a separate security-reviewed system and must not be added to this component.

Access is granted through `portal-login` in `src/lib/permissions.ts` for Super Admin, Admin, and Staff. Staff rows are filtered against `user.assignedClients`; maintain this restriction when changing the client-loading path.

## 10. Release gate

A release candidate must pass TypeScript/build, dependency review, all five role journeys, tenant/client isolation, authentication and recovery, core workflow persistence, Operational QA, backup/rollback preparation, and the external-launch operational controls in `RELEASE_GATE.md`.

## 11. Backup and recovery

Create a credential-safe archive after every major change. Exclude `.git/`, `.vercel/`, `.env`, `.env.local`, `node_modules/`, `dist/`, prior `backups/`, and generated test output. Database backup and point-in-time recovery are separate from source archives and must be configured before real customer data is accepted.

## 12. Operational security

- Do not log secrets, passwords, OTPs, tokens, tax credentials, or document contents.
- Use anonymized fixtures in development and testing.
- Keep service-role credentials in server/edge secret storage only.
- Review Supabase Security Advisor before every release.
- Enable leaked-password protection before external users are invited.
- Resolve exposed-schema `SECURITY DEFINER` warnings deliberately, not with blanket grant changes.
- Define incident response, access review, retention, deletion, and restore procedures before market launch.

## 13. Definition of done

A feature is complete only when its permitted role can perform the workflow, denied roles are blocked, data persists, failures are understandable, audit evidence exists where required, TypeScript/build pass, the hosted preview is checked, documentation is updated, and a safe backup exists.

## 14. Official-news collection (September 2026)

- `server/officialNews.ts` holds fixed source adapters, hostname allowlists, bounded downloads, XML entity rejection, title-only extraction, relevance filtering and date limits. Do not accept arbitrary fetch URLs from the browser. Third-party text is untrusted and never rendered as HTML.
- `api/news-sync.ts` is a Node Vercel function. GET requires CRON_SECRET; POST validates a Supabase access token and an active, undeleted GodAdmin profile. Server-only production variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET. Never prefix these secrets with VITE_.
- CAATH's production Node runtime uses `NODE_OPTIONS=--use-system-ca` so CBIC's certificate chain can be validated against the host operating system trust store. This retains HTTPS verification. Never replace it with disabled TLS verification or `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- `vercel.json` excludes `/api/` from the SPA rewrite and schedules collection at 02:00 UTC daily (execution precision depends on hosting plan). Production scheduling must remain enabled in Vercel.
- Migration `20260913050142_official_news_inbox.sql` adds RLS-protected inbox/source-health tables. Clients get SELECT only; SuperAdmins cannot read either table. A service-only atomic source claim provides a 10-minute cooldown and concurrency guard.
- Source URL uniqueness plus conflict-ignore inserts preserve rejected/approved items. Imports never touch published updates. `review_regulatory_news` locks an inbox row and atomically creates the publication, invokes the existing notification publisher, and records the owner decision. Repeated reviews are rejected.
- The review RPC deliberately uses SECURITY DEFINER for the atomic workflow. It checks auth.uid against an active, undeleted GodAdmin, fixes search_path, and revokes anonymous execution. Security Advisor flags this for manual review; do not silence it with broad grants.
- The collector reads only each source's latest page/feed, not archives. CBIC GST and Customs use the official latest-update API with fixed tax IDs 1000001 and 1000002. CBDT uses the official Income Tax latest-news page because its RSS endpoints returned HTTP 403 from Vercel. PIB returned empty/unavailable responses during initial verification. Health cards preserve last success and show failures. MCA, state GST, tribunal/court and historical archive adapters remain out of scope for this version.
- Tests: `npx tsx work/test-official-news.ts`, `node work/test-news-deployment.mjs`, `node work/test-news-ui.mjs`. The deployment test collects real official headlines into PENDING only; it never approves them. SQL approval/rejection tests must be rolled back to avoid notifying real users with test content.
- Disable collection by removing the cron entry and redeploying; do not delete inbox history. Keys can be rotated in server configuration. Keep the prior deployment for frontend rollback; migration is additive and compatible with the old app.

## 15. Recovery regression tests

`work/final-launch-check.mjs` with CAATH_TEST_PHASE=auth checks Chromium, Firefox and WebKit at mobile/tablet/desktop widths, expired links, valid recovery across reload, mismatch, success notice, session removal, new-password login and forced update failure. Only the controlled notification-test identity has its password changed. Owner sessions are read-only audit sessions and must be signed out locally, not globally.

## 16. GST GSP boundary

`server/gst-gsp.ts` defines the provider-neutral adapter contract and keeps production disabled unless all required server secrets are present and `GST_GSP_PRODUCTION_ENABLED=true`. The selected ClearTax route uses server-only `GST_GSP_PROVIDER=cleartax`, `GST_GSP_BASE_URL`, `GST_GSP_AUTH_TOKEN`, `GST_GSP_ENV` and `GST_GSP_PRODUCTION_ENABLED`. Other providers may use `GST_GSP_CLIENT_ID` and `GST_GSP_CLIENT_SECRET` instead of the Clear auth token. Never prefix provider secrets with `VITE_`.

`api/gst-gsp-status.ts` requires an authenticated active Super Admin or Admin. `gst_gsp_connections` stores firm/client/GSTIN connection state and explicit consent, while credentials remain in server secret storage. A new provider implementation must pass the operation contract, sandbox certification matrix, consent/audit tests, idempotency tests and provider webhook/signature checks before production enablement. Until then `UnconfiguredGspAdapter` returns a controlled 503 for API operations.

Migration `20260919173500_gsp_integration_foundation.sql` creates the connection and audit foundation. Operational requirements and vendor comparison are in `GSP_PARTNERSHIP_PLAYBOOK.md`, `GSP_VENDOR_RFP.md` and `GST_CERTIFICATION_TEST_MATRIX.md`.

## 17. Anonymous API hardening

Migration `20260919184626_harden_anonymous_data_api_access.sql` revokes all privileges on public tables and sequences and revokes public-function execution from the `anon` role. It also applies restrictive default privileges to future objects. Public marketing and authentication still use static routes and Supabase Auth; application data requires an authenticated role. Any future feature that genuinely needs anonymous database access must receive a narrow, reviewed grant and an explicit RLS policy rather than restoring schema-wide privileges.

Final acceptance verified zero anonymous table grants, zero anonymous public-function execution grants and RLS enabled on all 43 public tables.

## 18. Final release evidence

`FINAL_ACCEPTANCE_REPORT_2026-09-20.md` is the current acceptance record. `RELEASE_GATE.md` is authoritative for launch status, and `TESTING_READINESS.md` contains the pilot sequence. At this release, Cashfree live KYC and the GSP partnership remain external gates. Do not represent sandbox payment or GST analysis as live payment acceptance or direct GST filing.
