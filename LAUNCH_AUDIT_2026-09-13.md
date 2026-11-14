# CAATH launch audit — 13 September 2026

## Verified in this work

- Password-recovery regression: 12/12 grouped checks passed across Chromium, Firefox and WebKit using a controlled test identity. Public forms checked at 320, 390, 768, 1024 and 1440 pixels. Evidence: outputs/final-auth-check.json.
- Official-news parser: URL safety, CBIC GST/Customs JSON, CBDT public-page parsing and host restriction, duplicate suppression, relevance filtering, invalid/empty feed detection, XML entity rejection and Indian-date handling passed.
- Hosted news collector: anonymous GET denied, Staff POST denied, GodAdmin fetch accepted, repeated fetch throttled. The inbox contains 19 ICAI + 10 RBI + 7 CBDT/Income Tax items; collection created no publications. PIB remains unavailable. CBIC GST and Customs are configured but the official server certificate chain is rejected by Vercel's secure runtime; both sources remain unpublished, visibly flagged and eligible for later retry.
- Database review workflow: approval created publication and rejection did not, inside rolled-back transactions. No test news notifications persisted. SuperAdmin cannot read the private inbox or invoke owner approval.
- News UI: owner inbox, source links, note/verification gate and 390/768/1440 widths passed without publishing. Evidence: outputs/final-launch/news-inbox-*.png.
- Firm suspension: normal suspension now provides 30 days of continued access with a visible warning; immediate security suspension blocks at once. Neither path deletes firm or client data. Automated database and production God Admin UI verification passed against deployment `dpl_48L8P98Xjev5gjhwgHioqX4cT7fS`, using the dedicated CAATH Testing Workspace and restoring it to its original active state. Evidence: outputs/final-launch/firm-suspension-fixed.png.
- Cashfree sandbox: credentials are stored as Vercel secrets, server-side order creation uses Cashfree API `2025-01-01`, totals are recalculated on the server, every order supplies `https://caath.in/api/cashfree-webhook` as its Cashfree `notify_url`, signed webhook verification uses the raw request body, gateway records are RLS-protected, and paid orders remain subject to God Admin approval. Authenticated sandbox order creation, ₹1,179 Starter total, remote status lookup and unauthorized-request rejection passed against `dpl_3NrK6qWvTRX8g52ibMCTXAeywFV2`. Hosted checkout rendering passed; no real payment was attempted. Evidence: outputs/final-launch/cashfree-sandbox-checkout.png.
- TypeScript and production builds passed. Backups are under backups/, excluding local environment secrets.

## Hosted release evidence

Production deployment: `dpl_5CxV9ydCvh49wzYuEYxsU1rjbVNS` (Vite), live at https://caath.in on 13 September 2026. Hosted owner-inbox checks passed at 390/768/1440 pixels, and the production firm suspend/reactivate screen passed. Vercel project configuration confirms the daily `/api/news-sync` schedule is enabled at `0 2 * * *`. Cashfree sandbox order creation, per-order webhook routing, hosted-checkout rendering, remote status verification, unauthorized request rejection and unsigned-webhook rejection passed. Previous production deployments remain available in Vercel for rollback.

Production password-recovery checks subsequently passed 12/12 against https://caath.in; evidence: outputs/production-auth-check.json. The scoped Vercel error-log query returned no logs for this deployment; this is a point-in-time check, not continuous monitoring. Base commit b77c74e with preserved uncommitted project changes. A release backup was created at backups/after-news-and-recovery-release-20260913-105054.zip before this final evidence note.

## Remaining market-launch blockers

This is NOT a full-market-launch sign-off and no percentage is claimed.

- The wider role navigation audit found missing live API tables for invoices, invoice_payments, expenses, payroll_runs, gstr_filings and automation_runs, plus enterprise_activities errors. Some screens swallow these failures. These need schema/consumer reconciliation and real save/reload tests before advertising those workflows as ready.
- Existing role-test selector failures for similarly named navigation groups need correction before the suite can count as a final role acceptance run. See outputs/final-role-check.json; a navigation pass is not proof of successful financial transactions.
- Registration server-side validation and plan-limit controls need final hardening. Browser validation alone is insufficient.
- Cashfree live activation remains blocked by provider review and VCIP/KYC. Before real collection: add production credentials, whitelist `caath.in`, confirm the production account accepts the existing per-order `https://caath.in/api/cashfree-webhook` notification route, verify one signed delivery, run one controlled low-value live transaction, reconcile it in both Cashfree and CAATH, and test refund handling. Production notification email delivery, public policies/contact/refund terms and restore rehearsal also remain release gates.
- Phone/tablet viewport and browser-engine checks are not a substitute for final physical iPhone/Android-device acceptance, especially downloads, uploads and printing.
- Official-news coverage is deliberately limited. CBDT/Income Tax is active; CBIC GST/Customs is awaiting an official HTTPS certificate-chain fix. Failed sources plus unmonitored MCA/state-GST/court sources require follow-up; nothing is automatically verified.

Security Advisor reports nine authenticated SECURITY DEFINER warnings, including the explicitly owner-checked news-review RPC. New tables have RLS; no anonymous review execution is allowed. Review rationale and remaining warnings before broad launch: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.
