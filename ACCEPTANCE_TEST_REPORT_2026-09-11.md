# CAATH Acceptance Test Report

## Release hardening batch — 12 September 2026

- Hosted administrative account disablement and forced logout passed. The inactive Staff session was removed from the protected workspace and shown the correct inactive-account message; the controlled Staff account was restored to Active afterward.
- A fresh synthetic document upload exposed and corrected a false-failure condition caused by post-persistence telemetry. Successful uploads no longer appear failed, and incomplete metadata writes now clean up their Storage object.
- Client-specific All Files, Archived, and Trash filters were corrected and verified. The disposable fixture passed upload, archive, archive restore, move to trash, and trash visibility. At the owner's direction it remains safely in Trash as test evidence; permanent deletion was not required.
- Hosted GST Quick Health Scan passed upload, parsing, validation, persistence, retrieval, and analysis execution. The six-stage proof survived a full page reload and reported one workflow action and three governed insights.
- Optional legacy GST source tables now degrade to empty inputs when absent rather than blocking analysis based on uploaded datasets. Filing periods are normalized to database-safe `YYYY-MM` values, and purchase-register date filtering uses bounded date comparisons.
- Authenticated tenant simulation passed in both directions: the separate Test Firm identity saw zero CAATH clients, documents, or GST artifacts, while the CAATH test tenant saw its own one client, three document records, and GST validation artifacts only.
- Latest protected preview: `https://caath-pfshtthpm-vishvas-projects-cd8ae784.vercel.app` (`dpl_gDSUXzZ6Jqmifg2Vvz7ajgBo2mCf`, READY). Production was not changed.
- Final security preview: `https://caath-3omc8dh8p-vishvas-projects-cd8ae784.vercel.app` (`dpl_2JEPL36SK9xEvJw421uC3ekNaVov`, READY). Authenticated Super Admin verification confirmed that the repaired Audit Center displays all 21 permitted CAATH events, matching the database evidence.

## Government Portal Login Desk — 12 September 2026

- Protected preview returned HTTP 200 and loaded successfully.
- Super Admin saw the consolidated Portal Login Desk with client number, name, entity type, portal dropdown, readiness status, and Login action.
- GST, Income Tax, MCA, and TRACES choices rendered. Switching the dummy proprietorship from GST to MCA changed the readiness badge from `GSTIN ready` to `CIN / LLPIN missing`.
- Login opened the verified official MCA website in a separate tab.
- Staff saw only the assigned CAATH Demo Client after the assignment-filter correction.
- User IDs, passwords, OTPs, and CAPTCHAs are not collected or auto-filled by this feature.

Date: 12 September 2026

## Outcome

CAATH is ready for controlled owner testing on its protected Vercel preview. The production build passes, all five roles authenticate in the hosted application, role-specific navigation is isolated, the operational governance simulation passes, GST parsing and reconciliation fixtures pass, and the live client-contact isolation policy has been hardened and verified in Supabase.

## Evidence

- Operational QA: 9 passed, 0 failed, no governance integrity issues.
- Role access: 14 critical access assertions passed for God Admin, Super Admin, Admin, Staff, and Client.
- Super Admin navigation: Dashboard, Task Board, Client Master, Document Vault, GST Intelligence, Compliance, Regulatory Updates, Notifications, Notice Center, Approvals, User Management, Subscription, Staff Management, Audit Log, and Operational QA loaded without a blank screen or visible load error.
- Notifications: duplicate historical alerts repaired; consecutive runtime synchronization is protected by a five-minute idempotency window; archive actions now verify persistence.
- GST engine: CSV/JSON parsing, XLSX totals, malformed-file rejection, and all reconciliation classifications passed.
- Client isolation: live Supabase policies verified as four authenticated policies. Clients may select only their own `client_contacts` link; insert, update, and delete are restricted to God Admin, Super Admin, and Admin according to scope.
- Dependency audit: no moderate, high, or critical production finding. One low-severity local Windows development-server advisory remains in `esbuild`; it does not affect the generated static production bundle.
- Production preflight: TypeScript and Vite production build passed.

## Role Coverage

Controlled God Admin, Super Admin, Admin, Staff, and Client identities were authenticated on hosted previews. Admin reached its permitted operational modules. Staff saw only its assigned dummy client and no client Add/Edit controls. Client navigation was limited to Overview, Compliance, Documents, and Messages; its contact mapping resolved only `CAATH Demo Client`. Dummy account passwords are intentionally excluded from the repository.

## Testing Boundary

Use only dummy records and anonymized GST fixtures. Do not enter real GST portal passwords, confidential client files, or production tax data during this phase.

## Hosted Preview Readiness

- Added Vercel SPA fallback routing so direct browser links load the React application.
- Added defensive response headers and immutable caching for fingerprinted assets.
- Added deployment exclusions for private environment files, backups, local fixtures, and generated output.
- Verified the compiled production artifact at `/` and `/settings/subscription`; both render the secure sign-in experience without a blank page.
- Supabase Security Advisor reports zero errors. Nine warnings remain: eight intentional exposed-schema `SECURITY DEFINER` helper warnings that require a separate function-architecture migration, and leaked-password protection disabled. These should be resolved before inviting external users, but they do not block controlled dummy-account testing.
- Vercel preview deployment completed on the existing `caath` project. Deployment `dpl_Gywx6pFvtE61mtP7FcVV8PpQvqtR` is READY at `https://caath-2u3ka0fxd-vishvas-projects-cd8ae784.vercel.app` with deployment protection enabled. Root and direct-link requests return HTTP 200, the CAATH application chunks and Supabase project configuration are present, and the configured defensive headers are returned.
- After the owner completed Vercel access sign-in, a real hosted-browser pass verified the CAATH sign-in screen, password-recovery screen, workspace-registration screen, and unauthenticated `/settings/subscription` deep-link fallback. All rendered correctly without a blank page or visible application error.
- Release documentation is consolidated in `USER_MANUAL.md`, `DEVELOPER_MANUAL.md`, and `RELEASE_GATE.md`; the post-documentation production preflight passed.
- Hosted God Admin acceptance passed with a fresh controlled dummy identity: authentication, platform-scoped role resolution, Control Tower, Firm Operations, Provisioning, Usage Monitoring, Global Audit, Platform Config, Subscriptions, System Notices, Regulatory Publisher, session restoration in a new tab, and secure logout all rendered and behaved without a visible application error. No destructive platform action was executed.
- Hosted Super Admin acceptance found and fixed a concurrent startup-notification race. The corrected preview deployment `dpl_4CdyGPUNBZBjksJxbxzb4CcRiytK` is READY at `https://caath-3u20p2bo5-vishvas-projects-cd8ae784.vercel.app`; it returns HTTP 200 and prevented a new duplicate startup nudge. The historical duplicate was archived through the application.
- On the corrected preview, Super Admin authentication, dashboard, simplified Live Workspace, task board, client loading, private document listing, GST Intelligence, verified regulatory feed, notifications, notices, approvals, user management, security settings, audit screen, and Operational QA rendered without a visible application error. Operational QA reports 10 passed and 0 failed.
- Hosted Admin, Staff, and Client acceptance completed with controlled identities in `CAATH Testing Workspace (IND-TN-887)`. A Staff client-management exposure was found and corrected with both UI gating and service-level authorization. A separate Client portal mapping defect was found and corrected to resolve `client_contacts` before the legacy email fallback.
- Final role-isolation preview `dpl_G5odafuhyBSbTNV18xUU4RpRGUUH` is READY at `https://caath-idcd0n3di-vishvas-projects-cd8ae784.vercel.app`. Staff can read its assigned dummy client but cannot add or edit clients. Client resolves `CAATH Demo Client`, sees its private dummy document/timeline, and has no internal user-management navigation.
- Hosted Admin client mutation acceptance passed on the final role-isolation preview: a temporary dummy client was created, displayed, edited, displayed with the updated name, and deleted. The permanent `CAATH Demo Client` record was not modified.
- The same Admin mutation generated visible Created, Updated, and Deleted entries in Recent Activity, confirming audit propagation. Authenticated private-document listing and the download action passed for the mapped dummy document. A fresh tab after logout returned to CAATH sign-in.
- Final regression: CSV/JSON GST parsing, XLSX totals, malformed-file rejection, duplicate detection, and exact/missing/portal-only/value-mismatch reconciliation classifications passed. TypeScript and the production build passed; the production dependency audit remains clear of moderate, high, and critical findings.
- Document lifecycle defect found and corrected: Archive and Restore controls had been visual-only. The corrected hosted preview now passed archive, archived listing, archive restore, move to trash, trash listing, and restore-from-trash end to end. The permanent dummy document was returned to its original active state; permanent deletion was intentionally not executed against the retained fixture.
- Document lifecycle preview `dpl_2K9cti6oAjQuEqkzPUVBjbEszudc` is READY at `https://caath-cikwywxxl-vishvas-projects-cd8ae784.vercel.app`.
