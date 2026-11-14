# CAATH Final Acceptance Report

## Outcome

CAATH passed the final internal production acceptance sweep on 20 September 2026. It is ready for a controlled customer pilot. Paid public launch is conditional on Cashfree live approval and one controlled live-payment rehearsal. GST portal automation is conditional on selection and certification of a GSTN-empanelled GSP.

## Evidence captured

- `outputs/final-launch/home-mobile.png`
- `outputs/final-launch/login-mobile-final.png`
- `outputs/final-launch/login-desktop-final.png`
- `outputs/final-launch/reset-no-token-mobile.png`

## Acceptance results

| Area | Result | Evidence |
| --- | --- | --- |
| Production domain | Pass | HTTPS pages returned 200 |
| Security headers | Pass | HSTS, X-Content-Type-Options, X-Frame-Options and Referrer-Policy present |
| Mobile public/auth UI | Pass | 390px viewport, no horizontal overflow |
| Browser runtime | Pass | No page errors in tested anonymous routes |
| Registration validation | Pass | Invalid GSTIN blocked with a clear example |
| Recovery boundary | Pass | Missing/invalid recovery context returned to login |
| Anonymous APIs | Pass | Payment, GSP status and news sync returned 401 |
| Database RLS | Pass | 43/43 public tables have RLS enabled |
| Anonymous database access | Pass | Zero table grants and zero public-function execute grants |
| Sole God Admin | Pass | Exactly one active God Admin |
| Production build | Pass | TypeScript and Vite production build |
| Domain tests | Pass | Field validation, invoice tax and GST parsing/reconciliation |
| Dependency risk | Pass with note | No moderate/high/critical production advisory; one low dev-server advisory |

## External dependencies

- Cashfree: live KYC/activation and live keys must be approved by Cashfree.
- GST GSP: partner choice, contract, sandbox credentials and certification are pending.
- Business disclosure: complete legal operator name, registered address and support phone are pending owner input.

## Security change

Migration `20260919184626_harden_anonymous_data_api_access.sql` revokes anonymous privileges on all public tables, sequences and functions and applies the same default restrictions to future objects. It was applied to the linked CAATH Supabase project and recorded in migration history.

## Launch recommendation

Invite a small number of controlled pilot firms first. Use anonymized or explicitly approved data, monitor support and audit activity daily, and complete the Cashfree live rehearsal before accepting paid public registrations.

## Selected GSP route

ClearTax / Defmacro was selected as CAATH's primary GSP candidate, subject to an acceptable API-only startup contract. Production deployment `dpl_FWyywftiQmdTRySPUVNKkP9rcCki` configures the ClearTax sandbox endpoint and keeps production operations disabled. The private auth token remains intentionally absent until ClearTax approves the application and issues credentials.

The initial API-partnership enquiry was sent on 20 September 2026 to ClearTax GST Support and its GSTN-listed business contact. It requested sandbox onboarding, API-only pricing, multi-tenant CA-firm approval, certification steps, SLAs and security terms without transmitting sensitive KYC information.
