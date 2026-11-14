# CAATH Product Audit — 27 September 2026

## Executive status

- **Controlled testing readiness:** 92%
- **Public commercial launch readiness:** 78%
- **Recommendation:** continue invited pilot testing; do not take unrestricted public paid subscriptions until Cashfree production activation and external notification delivery are confirmed.

## Verified working

- Production TypeScript check and Vite build complete successfully.
- Public home, login, privacy, terms, refund and contact routes load over HTTPS.
- Public routes fit a 390px mobile viewport without horizontal overflow.
- Browser console showed no errors or warnings on the public registration journey.
- Registration validation passed 19 automated cases.
- PAN, GSTIN, TAN, CIN/LLPIN, email, Indian mobile and UUID validation tests pass.
- Invoice tax calculation tests pass.
- Password recovery has a dedicated reset screen, success handling and return-to-login flow.
- Unauthenticated Cashfree, GSP and regulatory-news API calls are rejected; the webhook rejects the wrong HTTP method.
- Database integrity checks found no orphan profiles, missing firms, firms without subscriptions, invalid stored PAN/GSTIN, duplicate PAN/GSTIN, expired active subscriptions or missing document paths.
- The production database currently contains exactly one active God Admin.
- Tenant and role policies use the current authenticated identity and firm scope. Security-definer helper functions inspected during the audit derive their result from `auth.uid()`; the regulatory-review function separately requires the active God Admin role.
- Cashfree test payment activation previously produced the expected active Professional subscription and invoice.
- Daily regulatory collection is running. CBDT, ICAI and RBI sources completed successfully on 27 September 2026.

## Corrected in this audit

- Updated the Privacy Policy to accurately disclose encrypted government-portal User ID/password storage and assisted login.
- Corrected the public security statement so it no longer contradicts the Portal Assist feature.
- Added explicit accessible labels to registration, sign-in, password and OTP fields.
- Added `robots.txt` and `sitemap.xml` for public search discovery while excluding the protected app and subscription settings from indexing.
- Corrected Vercel routing exclusions for downloads, web manifests, sitemap and offline page.
- Prepared an additive database migration that rejects invalid PAN, GSTIN, TAN and CIN/LLPIN values even if a write bypasses browser validation, and prevents duplicate PAN/GSTIN within a firm.

## Launch blockers and high-priority work

1. **Cashfree live activation:** production KYC/VCIP must be approved before CAATH can reliably accept real customer money. Keep checkout clearly in test mode until then.
2. **External notifications:** email, SMS and WhatsApp delivery are not live. The current runtime records in-app notifications but treats external channels as placeholders. Connect and verify one transactional email provider before public registration is opened widely.
3. **Regulatory source health:** both CBIC feeds currently fail TLS verification and PIB is temporarily unreachable. These sources must remain marked unhealthy; do not represent the inbox as complete coverage.
4. **Supabase migration history:** older production changes were applied without matching local migration versions. This blocks safe normal migration deployment. Reconcile history before applying the prepared identifier constraints or any later schema migration.
5. **Authenticated end-to-end suite:** public flows, database integrity and code paths were audited, but every role/action combination still needs repeatable automated browser tests using dedicated disposable Super Admin, Admin, Staff and Client accounts.

## Usability improvements recommended for the next cycle

- Add field-level errors beside the exact invalid registration field and move focus to the first error. The current top-level error is correct but slower for non-technical users.
- Extend automatic draft recovery beyond Client Master to long forms such as notices, compliance workpapers, invoices and regulatory review.
- Add search, authority filters and bulk rejection for the God Admin news inbox; 125 pending items is too much for one-by-one review.
- Provide a compact mobile navigation mode with Home, Work, Clients, Compliance and More; the full module list remains cognitively heavy.
- Split or defer the largest bundles (`App`, charts and Template Studio) to improve first-load performance on slower mobile connections.
- Label foundation-only integrations clearly. GSP filing, banking feeds, ERP sync and external communication federation are not yet production services.
- Either register a real service worker for the supplied offline page or remove offline/PWA implications until offline behavior is intentionally supported.

## Database observations

- Supabase security advisor reports nine callable `SECURITY DEFINER` functions. They are intentional API/RLS helpers, and the inspected definitions scope access through the current authenticated user. Continue reviewing every new privileged function and grant it only to the minimum role.
- Performance advisor reports 61 warnings: 55 overlapping permissive policies, five auth-function init-plan opportunities and one duplicate index. These are performance/maintainability items rather than confirmed tenant leakage, but should be cleaned before scale.
- Current workspace counts at audit time: three active firms; one active subscription; two trials; one God Admin; three Super Admin users.

## Release gate

CAATH is suitable for a small invited pilot today. Public marketing can begin with a waitlist/demo offer. Unrestricted paid launch should wait for Cashfree live approval, verified transactional email, Supabase migration-history repair and a disposable-account role matrix run.
