# AUTH Logout Trace

## Exact global logout trigger

The browser request to `logout?scope=global` is produced by Supabase Auth when the application calls:

- `src/domains/auth/repositories/SupabaseAuthRepository.ts` -> `supabase.auth.signOut()`

Temporary tracing was added before this call:

- `[AUTH] Logout requested by src/domains/auth/repositories/SupabaseAuthRepository.ts:12`

## Call paths that can request logout

1. Explicit user logout:
   - `src/App.tsx` -> `handleLogout`
   - `src/context/AuthContext.tsx` -> `logout`
   - `src/domains/auth/services/authService.ts` -> `logout`
   - `src/domains/auth/repositories/SupabaseAuthRepository.ts` -> `signOut`

2. OTP-required password login:
   - `src/domains/auth/services/authService.ts` signs the password session out after a valid password login when OTP is required.
   - This is intentional session handoff before email OTP verification.

## Why the dashboard appeared to cause logout

The missing optional tables (`enterprise_activities`, `task_reassignments`, `document_vault`, `invoices`, `payroll_runs`, `login_activity`) were not direct callers of logout. They caused fail-fast startup promises in dashboard and operational intelligence modules. Those rejected requests could interrupt dashboard bootstrap and look like an auth failure in the UI.

## Code changed

- Added temporary auth debug logs for session creation and logout request origins.
- Added `[AUTH] login_activity unavailable` warning when the optional login activity table cannot be written.
- Changed dashboard bootstrap from fail-fast `Promise.all()` to `Promise.allSettled()` with safe fallbacks.
- Guarded AI dashboard nudges/intelligence so optional failures are warning-only.
- Changed workflow integrity input loading to `Promise.allSettled()` so missing `task_reassignments`, `invoices`, and `payroll_runs` do not break dashboard metrics.
- Changed enterprise knowledge graph loading to `Promise.allSettled()` and added `[AUTH] enterprise_activities missing`.
- Changed the nested operational panel bootstrap to `Promise.allSettled()` so one unavailable enterprise module does not prevent the rest of the dashboard from rendering.

## Database changes

None. No migrations, tables, RLS policies, or constraints were modified.
