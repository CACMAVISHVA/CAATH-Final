# CAATH Security Hardening Report — 12 September 2026

## Outcome

Controlled dummy-data UAT readiness is **99%**. This is not approval for public launch or real client data.

## Tenant-isolation evidence

Authenticated-role simulations were executed in both directions between CAATH Testing Workspace and TEST FIRM. Every tested family returned `cross_tenant_rows = 0`:

- clients, documents, and GST artifacts;
- tasks and notices;
- billing and subscription invoices;
- support tickets;
- notifications (firm-scoped rows);
- audit logs.

The CAATH identity could still see its permitted own-firm evidence, including one task, 17 notifications, and 21 audit events, proving the test was not merely a blanket denial. TEST FIRM had no own rows in these families and saw no CAATH rows.

There is currently no dedicated persisted payroll table. Payroll-specific RLS coverage must be introduced if persisted payroll records are added.

## Audit Center correction

The hosted Audit Center showed an empty state while 21 permitted rows existed. The root cause was a missing `audit_logs.severity` column combined with discarded query errors and an absent optional `portal_audit_logs` source.

The forward-only correction:

- adds a required severity field with a safe `info` default and validation constraint;
- preserves and classifies all existing audit rows;
- keeps standard audit-source failures visible;
- treats only a genuinely missing optional portal-audit source as an empty optional stream;
- shows a clear Audit Center error instead of a false “No audit events” result.

Database verification confirmed the column is non-null, its default is `info`, no invalid severity rows exist, and tenant isolation remains intact. The production build and TypeScript checks pass.

## Supabase security-advisor disposition

No security-advisor error was returned. Warnings remain for leaked-password protection and authenticated `SECURITY DEFINER` functions.

- Leaked-password protection is disabled and is available on Supabase Pro. Upgrade and enable it before external users are invited.
- Parameterless identity/subscription helpers return only the caller's own firm, profile, role, subscription state, or feature flags. They use fixed search paths and are intentionally executable by authenticated users because RLS policies depend on them.
- `create_workspace_owner` validates `auth.uid()`, matches the authenticated email, rejects users that already have a profile, and uses a fixed search path. Before unrestricted public signup, move this bootstrap behind a rate-limited server-side boundary to reduce abuse risk.

## Hosted verification

- Final preview: `https://caath-3omc8dh8p-vishvas-projects-cd8ae784.vercel.app`
- Deployment: `dpl_2JEPL36SK9xEvJw421uC3ekNaVov` (`READY`, Preview only)
- Sign-in and password-recovery screens render successfully.
- The recovery screen no longer carries a stale sign-in error.
- The former dummy password was not retried or changed. The owner signed in with a valid Super Admin session, and hosted verification confirmed all 21 permitted audit events render with severity labels and export controls.

## Remaining market-launch gates

1. Confirm delivery and completion of one password-recovery email using an owner-controlled test account.
2. Upgrade Supabase and enable leaked-password protection.
3. Put unrestricted workspace bootstrap behind a rate-limited server-side boundary.
4. Complete owner UAT, operational monitoring, legal policies, billing decisions, and formal go-live approval.

Production was not promoted, real client data was not used, and no permanent deletion was performed.
