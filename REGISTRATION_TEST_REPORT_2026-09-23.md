# CAATH Registration Test Report — 23 September 2026

## Result

Registration is operational on `https://caath.in` and the tested signup combinations passed.

## Root cause corrected

Supabase correctly rejected commonly used or breached passwords with the provider code `weak_password`. CAATH did not recognise that provider code or the wording "Password is known to be weak", so the specific rejection was replaced by the generic message "An error occurred during authentication".

CAATH now:

- recognises Supabase `weak_password`, duplicate-user, email-rate-limit, invalid-email and disabled-signup errors;
- explains when a password is common or does not meet the security requirements;
- validates passwords before signup (8–72 characters, uppercase, lowercase, number and special character);
- normalises registration email addresses to lowercase;
- displays the password rules on the registration page.

## Verification completed

- Registration validation matrix: **19/19 passed**.
- TypeScript check: **passed**.
- Production build: **passed** (3,590 modules).
- Preview browser rendering: **passed**.
- Production browser rendering on `caath.in`: **passed**.
- Production signup page HTTP check: **200**.
- Valid workspace without GSTIN: **passed**.
- Valid workspace with GSTIN: **passed**.
- Uppercase email normalisation: **passed**.
- Duplicate email rejection: **passed** (`user_already_exists`).
- Weak/common password rejection: **passed** (`weak_password`).
- Successful registrations were verified as `Pending Approval`; firms were `Pending`; subscriptions were `Pending Verification`; trial dates were not started before God Admin approval.

## Account cleanup

After testing, every firm, subscription, non-God profile and non-God Supabase auth identity was removed in one verified transaction.

Final state:

- Supabase auth users: **1**
- Supabase auth identities: **1**
- Public user profiles: **1**
- Firms: **0**
- Subscriptions: **0**
- Remaining profile: `cacmavishva@gmail.com` — `GodAdmin` — `Active`

## Backups

- Code backup: `backups/20260923_signup_error_fix/`
- Protected database backup schema: `caath_backups`
- Backup prefix: `pre_cleanup_20260923_`
- Backup tables: **42**
- Backed-up auth users: **14**
- Backed-up firms: **14**
- Access for `anon` and `authenticated`: **revoked**

The Supabase database advisor also reports older security/performance warnings in the existing schema. They were not created by this registration fix and should be handled as a separate hardening change with its own regression cycle.
