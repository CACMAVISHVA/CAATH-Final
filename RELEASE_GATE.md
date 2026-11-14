# CAATH Release Gate

Date: 20 September 2026

## Decision

- **Controlled pilot with dummy or approved low-risk data: GO**
- **Paid public launch: CONDITIONAL GO**
- **Automated GST portal filing: NOT YET ENABLED**

The CAATH application, domain, database, role model, subscription workflow and core practice modules are ready for a controlled market pilot. Public payment collection can be enabled only after Cashfree completes live KYC and a controlled low-value payment succeeds. Direct GST portal API operations require an empanelled GSP partner, sandbox credentials and certification.

## Final acceptance evidence

- `https://caath.in` and the login, privacy, terms, cancellation/refund and contact routes respond over HTTPS with HSTS, clickjacking protection, MIME protection and a strict referrer policy.
- The 390-pixel mobile pass found no horizontal overflow on the public site, login and legal/support pages.
- Production pages generated no browser errors during the final anonymous acceptance pass.
- Invalid GSTIN text is rejected in workspace registration before an account is created.
- A reset-password URL without a valid recovery token returns safely to sign-in and does not create an authenticated session.
- Unsigned requests to payment ordering, GST partner status and official-news syncing return HTTP 401.
- TypeScript and the production Vite build pass.
- PAN/GSTIN/mobile/email field tests, invoice tax tests and CSV/JSON/XLSX GST parser and reconciliation tests pass.
- Production dependencies have no moderate, high or critical advisory. One low-severity development-server advisory remains and does not affect the static production bundle.
- All 43 public database tables have Row Level Security enabled.
- Anonymous access to public tables, sequences and functions has been revoked. Verification found zero anonymous table grants and zero anonymous public-function execution grants.
- Exactly one active God Admin exists. Role/status checks also confirmed active Super Admin, Admin, Staff and Client accounts for controlled testing.
- Source backups exist from before the anonymous-access hardening and after the major GST/GSP implementation.

## External launch gates

1. Cashfree must approve live KYC, issue production credentials and accept the registered production webhook.
2. Run one controlled low-value payment, confirm the signed webhook, God Admin approval, subscription activation and invoice creation, then refund or reconcile it.
3. Select a GSTN-empanelled GSP. Add its sandbox credentials only to Vercel server secrets, certify read/write operations, then explicitly enable production. Until then CAATH's GST analysis, workpapers, reminders, reports and lifecycle management remain usable without automated filing.
4. Add the operator's complete legal name, registered postal address and dedicated support phone to the public policies before broad paid advertising. The present pages disclose the support email and Tamil Nadu, India only.
5. Record the owner's formal pilot approval and nominate incident, backup-restore and customer-support owners.

## Operational rules

- Do not store government-portal passwords, OTPs, UPI PINs, CVVs or banking credentials in CAATH.
- God Admin must approve new firms and paid subscriptions; payment success alone does not activate a firm.
- A normal suspension starts the 30-day grace period and does not delete customer data. Immediate suspension is for security or abuse cases.
- Regulatory content stays private until God Admin verifies and publishes it.
- Every release must pass `npm run preflight` and retain a credential-safe source backup.

## Rollback

The stable production deployment before this acceptance pass is `dpl_FiLE7y1nUnyvAApfvEppcX9Znrky`. The database hardening migration is forward-only and intentionally removes anonymous data access; do not reverse it during a frontend rollback.
