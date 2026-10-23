# Recovered CAATH requirements — 23 October 2026

Coverage is incomplete: the chat connector lists only the 50 most recent chats and pinned chats, with no paging/search parameter. Older ChatGPT project chats require browser sign-in. Do not describe this as an exhaustive all-chat audit yet.

## Source register

- [GST return tracker feature](chatgpt-conversation://6ac54e63-236c-83ee-b87d-99fbe74d9367): all three turns recovered. Direct user requests: client-by-return-by-month/year matrix for 400 clients; GSTR-1, 3B, 7 and other applicable forms; staff filing updates; Optotax-like reports at low cost; practitioner-demand research. Supporting assistant roadmap is recorded as a proposal, not proof of completed delivery.
- [Instagram post review](chatgpt-conversation://6ada322b-b49c-83e8-9dc7-074e3b6ed7f2): user instructions and TaxBotGPT/CaThrives screenshots recovered; assistant bodies are unavailable content references.
- [Competitor Analysis Proposal](chatgpt-conversation://6acf4dd4-b5bc-83e8-8d7e-97614a6ef4fd): request for truthful market-research proposal/PDF; assistant analysis unavailable.
- [Compare web app and desktop options](chatgpt-conversation://01a13bac-1668-7fa0-9de6-60f71e43f64c): user approved recommended hardening; keep web SaaS, server authority, protected AI, safe uploads and tenant isolation. A separate local checkout contains unfinished implementation.
- [Implement CAATH Notice Intelligence](chatgpt-conversation://01a16458-8108-78e1-9c9f-8a00c9606c8d): explicit manual PDF upload, client linkage, assignments, deadlines, status, audit trail, notice-task-notification compatibility, isolated preview. Its local changes remain uncommitted; remote feature branch still points at baseline. Do not blindly merge its incompatible notice migration.
- “Fix shared login tracking” inspected and excluded: concerns office Samba accounts, not CAATH authentication.

## Recovery discoveries: reuse before building

The earlier local CAATH_FOUNDING_BETA checkout contains modules absent from CAATH-Final main. Files have been inspected, but historical claims of delivery are not equivalent to passing current tests or deployed code. Preserve that checkout unchanged.

| Requested capability | CAATH-Final baseline | Recovered implementation / remaining work | Priority |
|---|---|---|---|
| 400-client GST return matrix | Partial: live return tables; missing UI | GSTPracticeHub.tsx, gstPracticeHubService.ts, gstDueDateEngine.ts in older checkout. Reconcile and reuse; do not create competing tables. | P1 |
| Return applicability and frequencies | Partial | Existing gst_client_return_profiles; older UI supports five filing forms, omits requested GSTR-7. Profile replacement uses delete-then-insert and needs an atomic operation. | P1 |
| Filed/verified workflow, ARN, proof and audit | Partial | Older statuses are Filed/Pending/Not Applicable/Unknown; reviewer verification and proof need assessment. Never treat a manual tick as portal verification. | P1 |
| Persistent missing-return/overdue detection | Partial | Older due-date engine/control center and tests exist. Check historical periods and 400-client scale; legal due dates require current source verification before enabling automatic decisions. | P1 |
| Optotax-like reconciliation and reports | Partial | Older local parsing/matching, control reports and 14 CSV packs claimed in OPTOTAX_PARITY_ROADMAP.md. Validate outputs and persistence; keep financial calculations deterministic. | P1 |
| Fuzzy invoice matching, duplicates, ITC risk, vendor exceptions | Partial | Current GST engine plus older reconciliation code; evaluate fixtures before extending. | P1 |
| GSTR-1 vs 3B, monthly/annual summaries and exports | Partial | Existing analytics/export modules; inspect report coverage rather than creating another report engine. | P1 |
| GST workpapers, challans and litigation | Partial | Older GSTComplianceLifecycle.tsx/service match production table names. Reuse with role and tenant hardening. | P1 |
| GSP consent, sync jobs and notice monitoring | Partial | Older server/gst-gsp.ts, api/gst-gsp-status.ts, gspIntegrationService.ts exist. Historical documents name ClearTax as candidate, Masters India/FinAGG fallbacks. Live credentials/contracts/certification unverified. | P1 dependency |
| Private manual notice PDFs | Partial | Earlier Notice Intelligence checkout has validation, private bucket policies and tests. Existing Vault has linked_notice_id but upload helper builds public URLs. Reconcile secure storage rather than copy the whole conflicting migration. | P1 |
| Notice task and notification integration | Partial → preview implemented | Atomic intake/update RPCs, idempotency and in-app notification regression tests. Scheduled email/WhatsApp delivery remains separate. | P0 |
| Server-only AI and secure sensitive actions | Partial | Older ai-document-extract function exists; assess document identity/byte provenance, provider limits and audit error handling before reuse. Current Vite still embeds key configuration; preview key is blank. | P0 |
| Document intake from email/WhatsApp and checklists | Partial | Vault/task modules exist; inbound adapters, classification and missing-document follow-ups require verified delivery contracts. | P2 |
| Staff capacity, recurring tasks, maker/checker | Partial | Reuse TaskBoard/workflow/approval modules. Validate server enforcement and persistent execution. | P1–P2 |
| Timesheets, DSC custody/expiry, UDIN | Partial / unverified | time_entries live; older practiceToolsService/PracticeTools found. Inspect exact coverage before designing. | P2 |
| Client portal, filing acknowledgements, payments and requests | Partial | Existing client portal and document/billing services. End-to-end checks needed. | P2 |
| Tally/Excel integration and two-way accounting sync | Partial / missing adapter | Existing imports and older accounting add-on roadmap. Do not claim live Tally connector. | P2–future |
| Optional client-books accounting | Partial | Older AccountingAddon and management panel; roadmap covers journals, locks, ledgers, trial balance, P&L, balance sheet, GST/TDS, bank matching. Pricing suggestions are historical, not approved charges. | P3 |
| Template Studio | Partial | Older TemplateStudio/documentTemplateService for original editable working drafts. Reuse after validation. | P3 |
| Regulatory publishing and official news | Partial | Older publisher, regulatory services, news API and officialNews server. Review source trust and approvals before activation. | P2 |
| Client bulk import, branding, recovery/help flows | Partial | Older clientBulkImportService/tests, firmBrandingService, PasswordRecoveryScreen and HelpCenter. Reconcile compatibility. | P2 |

## Next safe integration sequence

1. Finish Phase 1 security, notification and browser checks; reconcile private PDF implementation.
2. Recover remaining older chats and annotate every requirement with source and acceptance evidence.
3. Import/review existing GST Practice Hub, lifecycle and report modules on the isolated branch; align with existing schema; fix missing forms, atomic profile updates and reviewer evidence. Do not copy legacy database setup scripts.
4. Review server-only AI and GSP adapters; no provider activation without tested sandbox contracts, consent and secrets.
5. Practice operations/accounting/template/regulatory recovery in separate reviewable phases.

No production changes, merges, provider filings or payments are authorized by this report.
