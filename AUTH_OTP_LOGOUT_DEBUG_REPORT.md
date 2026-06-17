# Auth OTP Forced Logout Debug Report

Date: 2026-06-17

## Root Cause

The frontend was partially enforcing email OTP after successful password login even when Supabase email OTP delivery was not explicitly enabled for the deployment.

Responsible files and lines:

- `src/services/authSecurityService.ts:22` gates OTP delivery behind `VITE_CAATH_EMAIL_OTP_ENABLED === 'true'`.
- `src/services/authSecurityService.ts:48` now defaults `otpEnabled` to `false`; before this fix, the fallback default was `true`.
- `src/services/authSecurityService.ts:139-143` determines whether a password login requires OTP.
- `src/services/authSecurityService.ts:147-160` is the only frontend code path that calls `supabase.auth.signInWithOtp()`, producing `POST /auth/v1/otp`.
- `src/domains/auth/services/authService.ts:26-41` is the password-login OTP handoff. Before this fix, it called `signOut()` before `sendEmailOtp()`, so a failed `/auth/v1/otp` request left the password session cleared.
- `src/services/authSecurityService.ts:181-185` is the OTP verification path using `supabase.auth.verifyOtp()`.
- `src/context/AuthContext.tsx:112` registers `onAuthStateChange()`.
- `src/context/AuthContext.tsx:146-147` runs periodic session refresh.

## Fix

- OTP is disabled by default in frontend fallback settings.
- OTP delivery is explicitly opt-in through `VITE_CAATH_EMAIL_OTP_ENABLED=true`.
- `sendEmailOtp()` refuses to initialize OTP when the deployment flag is not enabled.
- Password login no longer signs out before OTP delivery succeeds.
- Database defaults in `supabase/migrations/20260617_enterprise_auth_security_foundation.sql` and `MISSING_AUTH_TABLES.sql` now default `otp_enabled` to `false`.
- `.env.example` documents `VITE_CAATH_EMAIL_OTP_ENABLED=false`.

## Optional Module Safety

No optional enterprise module lookup was found to call `supabase.auth.signOut()` or `authService.logout()`. Missing optional tables such as `enterprise_activities`, `invoices`, or `payroll_runs` can fail their own module loads, but they are not auth-session invalidators. The logout network request requires one of the explicit sign-out callers in:

- `src/domains/auth/services/authService.ts:40`
- `src/domains/auth/services/authService.ts:137`
- `src/domains/auth/repositories/SupabaseAuthRepository.ts:14-18`

## Verification

- `npm run build` completed successfully on 2026-06-17.

