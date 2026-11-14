# CAATH Testing Readiness

Date: 20 September 2026

## Current position

CAATH is **100% ready for controlled pilot testing** and approximately **98% ready for paid public launch**. The remaining two percent consists of external-provider activation and owner-supplied business details, not unfinished core application coding.

## Verified in the final acceptance pass

- Production TypeScript and Vite build pass.
- Public domain and legal/support routes return successfully with defensive browser headers.
- Phone-width rendering passes without horizontal overflow on the public site, authentication and legal/support pages.
- Workspace registration rejects malformed GSTIN values before creating an account.
- PAN, GSTIN, mobile and email validation tests pass.
- Password recovery requires a valid recovery session; an ordinary reset URL returns to sign-in.
- Payment, GST partner and news-sync APIs reject anonymous requests.
- GST CSV, JSON and XLSX parsing, totals, duplicates, validation and reconciliation classifications pass.
- Invoice tax calculations pass.
- All public tables have RLS enabled; anonymous database grants and anonymous public-function execution have been removed.
- Exactly one active God Admin is present.
- Cashfree server credentials are configured in Vercel, but the live environment must remain gated until provider KYC approval and a controlled live transaction.
- The GSP adapter, consent model, sandbox/production separation and production kill switch are implemented. Provider credentials are intentionally absent until a partner is selected.

## Pilot test order

1. God Admin: review a new registration, approve it, verify notification/audit history, then suspend and reactivate the dummy firm using the 30-day grace flow.
2. Super Admin: create a client, task, notice and invoice; upload a logo; verify the logo appears on every selected invoice template.
3. Admin and Staff: verify assigned-client visibility, task hand-off, documents, government portal launch desk and denied management actions.
4. Client: verify only the mapped client's approved records and documents are visible.
5. GST: upload anonymized portal exports, inspect validation, reconciliation, workpapers, reminders, challans and reports. Do not enable filing without a certified GSP sandbox pass.
6. Subscription: after Cashfree live approval, make one low-value controlled payment and verify webhook, God Admin approval, activation and invoice end to end.
7. God Admin news: fetch official updates, review the source, approve one dummy-safe item and reject another; confirm only approved content reaches Super Admins.

## Stop-the-launch conditions

- Any cross-firm or cross-client data exposure.
- A role can perform an action outside its permission set.
- A payment can activate service without verified Cashfree status and God Admin approval.
- Password reset grants access without setting a new password.
- A production build or core acceptance test fails.
- A high-severity security advisor finding is verified as exploitable.

## Known non-blocking cleanup

- Supabase reports performance suggestions for older RLS policy expressions, overlapping permissive policies and a duplicate trusted-device index. These should be optimized under a measured migration, not changed hurriedly during launch acceptance.
- Several signed-in security-definer helper functions remain intentionally callable and perform internal role/current-user checks. Anonymous execution is revoked.
- One low-severity `esbuild` advisory affects the Windows development server; the deployed static production bundle is not exposed to it.
- More anonymized GST portal-export variants should be added during the pilot as firms encounter real-world formats.

## Owner entry point

Use `https://caath.in/login` for the hosted pilot. `START_CAATH_TESTING.cmd` remains available only for local/offline developer testing. Keep all passwords, OTPs, payment secrets and government credentials outside screenshots and manuals.
