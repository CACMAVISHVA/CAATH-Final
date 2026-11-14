# CAATH GSTN/GSP Partnership Playbook

## Provider decision — 20 September 2026

Primary choice: **ClearTax / Defmacro Software Private Limited**, subject to an acceptable API-only startup quote and contract.

Why: GSTN lists Defmacro/ClearTax as an empanelled GSP; Clear publishes separate sandbox and production API documentation; it states 99.99% availability with redundancy and has a substantial enterprise integration track record. CAATH should request its API-only ASP/GSP partnership, not purchase the end-user Clear Compliance subscription.

Commercial position: sandbox first, low-volume usage pricing, no large annual minimum, and production only after certification. If ClearTax cannot support multi-tenant CA-firm use on commercially reasonable terms, issue the same RFP to Masters India and FinAGG as the two fallbacks. Do not weaken security or accept a non-empanelled intermediary merely to reduce price.

## Recommended route

Operate CAATH as an Application Service Provider (ASP) and contract with an existing GSTN-empanelled GST Suvidha Provider (GSP). GSTN states that an ASP does not require separate empanelment and must tie up with a GSP to push or download taxpayer data. Becoming a GSP directly is a later-stage option requiring financial qualification, technical evaluation, legal agreements and dedicated connectivity.

## Commercial shortlist process

Request comparable proposals from at least three current GSTN-empanelled providers. Suitable initial candidates for evaluation include IRIS Business Services, Cygnet, ClearTax/Defmacro, Masters India and Chartered Information Systems/TaxPro. Selection is not complete until technical and legal due diligence is finished.

Ask every provider for:

1. ASP/reseller agreement and current GSTN empanelment evidence.
2. Sandbox credentials and complete API/OpenAPI documentation.
3. APIs for taxpayer authentication, GSTR-1, GSTR-3B, GSTR-2A/2B, notices, challans, filing status and ARN retrieval.
4. Per-GSTIN, per-call and filing pricing with minimum commitments.
5. Rate limits, uptime SLA, support escalation and planned-downtime terms.
6. India data residency, encryption, log retention, breach notification and subcontractor details.
7. Consent/OTP flow, session expiry, IP allow-list and credential-handling requirements.
8. Sandbox-to-production certification checklist and expected onboarding timeline.
9. Exit terms, data portability and credential/key revocation process.

## Ready-made implementation sequence

1. Sign NDA and obtain the provider's sandbox documentation.
2. Complete CAATH vendor-security and commercial comparison.
3. Sign the ASP/GSP agreement and data-processing terms.
4. Add sandbox secrets only in Vercel encrypted environment variables: `GST_GSP_PROVIDER`, `GST_GSP_BASE_URL`, `GST_GSP_CLIENT_ID`, `GST_GSP_CLIENT_SECRET`, `GST_GSP_ENV=sandbox`.
5. Implement the selected provider adapter behind `GspAdapter`; do not change CAATH domain workflows.
6. Map provider payloads to CAATH canonical returns, notices and challan contracts.
7. Complete sandbox tests for authentication, consent, fetch, validation, filing, error recovery, rate limits and idempotency.
8. Run security review: no secrets in browser/database/logs, redact taxpayer payloads, verify tenant isolation and revoke flows.
9. Pilot with the owner's GSTIN and one consenting test client.
10. Obtain provider production approval and credentials.
11. Set production secrets, keep `GST_GSP_PRODUCTION_ENABLED=false`, and run read-only production verification.
12. Enable production writes only after signed user consent and owner approval; then set `GST_GSP_PRODUCTION_ENABLED=true`.
13. Roll out GSTIN-by-GSTIN with audit monitoring and immediate kill-switch capability.

## Release gates

- No direct filing without explicit GSTIN-level consent.
- No production operation from a sandbox connection.
- No browser exposure of provider secrets.
- Every write uses an idempotency key and records a redacted audit event.
- OTP/CAPTCHA is never persisted.
- Filing success requires GSTN/provider ARN confirmation, not merely an HTTP success response.
- Reconciliation and workpapers remain usable when the provider is unavailable.
