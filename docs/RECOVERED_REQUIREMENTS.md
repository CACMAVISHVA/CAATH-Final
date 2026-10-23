# Recovered CAATH requirements — 23 October 2026

Coverage is incomplete: the chat connector lists only the 50 most recent chats and pinned chats, with no paging/search parameter. Browser sign-in succeeded and older chats are now being recovered. Do not describe this as an exhaustive all-chat audit yet.

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

## Additional browser-recovered decisions

- [Competitor analysis](https://chatgpt.com/c/6ac930c7-0518-83ee-b146-bc845c9625e2): Glex Media Ultimate CA & Accounting Toolkit was discussed. User explicitly rejected a separate toolkit business: integrate useful capabilities into CAATH. The earlier proposed toolkit checkout/pricing is superseded. Includes Income Tax computation, ITR workpapers, AIS/26AS, capital gains/depreciation; TDS/TCS calculations/challans/interest; bookkeeping and bank reconciliation; financial statements/cash flow/schedules/ratios; payroll/PF/ESI/gratuity/professional tax; CMA/project reports/working capital/EMI; quotations/credit notes/e-invoice/e-way bill workflows. Turia was a secondary practice-management benchmark. These historical competitor claims need current verification before publishing comparisons.
- [Wealth Goal Feasibility](https://chatgpt.com/c/6acd33d1-3c38-83ee-8cdd-3c0fe75da0d9): recovered the CAATH master implementation prompt, including Vyapar TaxOne and an unnamed ₹399 ROC toolkit. ROC scope: AOC-4 variants, MGT-7/7A, ADT-1, DIR-3 KYC, DPT-3, MSME-1; CIN/FY/company/capital/document/financial/approval mismatch checks, SRN and acknowledgements, editable reviewed outputs. Accounting scope: bank PDF/CSV/Excel normalization, duplicate detection, ledger suggestions, unmatched review, no uncertain automatic posting, controlled Tally import/export. P0 launch gates: invitations, auth, tenant isolation, payments/subscription enforcement, backup restoration, real-data-free staging and tested core workflows. No separate toolkit, no unapproved prices, no empty pages implying implemented capability.
- [Integrate CAATH Improvements](https://chatgpt.com/c/6ac672bb-520c-83e8-8e8d-04c13664c0a2): older GST Control Centre and notice-monitoring ZIP checkpoints were produced but not confirmed live. Notice requirements include GSTIN/PAN watches, mailbox intake, unmatched queue, duplicates, task conversion, stale/failed monitoring, last/next check times and deadline reminders. User specifically requested alert delivery to each CAATH account's registered email, in addition to in-app alerts. Receiving alerts does not authorize inbox access. Email delivery remains a dependency, not completed.
- Notice case depth from that chat: multiple notices/replies/hearings/orders per case; tax/interest/penalty exposure; separate response/hearing/payment/appeal deadlines with extension history; reviewer approval; closure outcome/evidence; client uploads and portfolio views. Current preview supports a basic single-notice lifecycle only.
- [What is React Native](https://chatgpt.com/c/6a0c7128-05cc-8324-bf85-3e1366656455): user explored AES-256 request/response protection. Treat as a security requirement for review, not authorization to add a shared browser encryption secret or replace the Supabase authentication protocol. No credentials from historical examples are retained in this report.

## Preview defect found and fixed

The authenticated profile query ambiguously joined users to firms because production schema has multiple relationships (membership plus suspension/reactivation actors). The preview returned PGRST201 after successful authentication. Explicit firms!firm_id joins now select the membership relationship. The same authenticated REST query passes against preview; type-check and build pass. Browser login, manual notice creation, task linkage, draft persistence and status history passed on the earlier preview. Monitoring UI browser verification remains pending.

## Survey-derived workflow requirements

[Form insights for CAATH](https://chatgpt.com/c/6ac67099-b568-83e8-bb60-5b2328c9927e): user asked to retain survey insights. Add document reminders that stop on receipt and escalate when overdue; ITC exception lifecycle from missing 2B through vendor follow-up, resolution and claimed/recovered reporting; Form 3CD mapping with AIS/26AS, depreciation and reviewer checks; normalized imports for Tally, Excel, Zoho, Busy, SAP and QuickBooks. These are partial or missing pending module-level verification. Prioritize GST control, document follow-ups and reconciliation before new accounting adapters.
