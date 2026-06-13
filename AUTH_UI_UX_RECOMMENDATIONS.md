# Auth UI/UX Recommendations

Generated: 2026-06-13

## Implemented

- Removed public role dropdown for signup.
- Locked public signup to Client.
- Made firm workspace ID required for Client self-signup.
- Added user-safe signup/login/recovery error handling.
- Added Forgot Password and Reset Password modes.
- Added success notices instead of browser alerts in the active login screen.

## Remaining Recommendations

- Replace raw firm workspace IDs with signed invitation tokens before external pilot.
- Add password confirmation and strength meter.
- Add resend verification email.
- Add rate-limited recovery request UI state.
- Add end-to-end browser tests against a disposable Supabase project.
