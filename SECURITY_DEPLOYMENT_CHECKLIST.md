# CAATH Security Deployment Checklist

## Environment Separation
- Use `.env.example` as the only frontend env reference.
- Store `SUPABASE_SERVICE_ROLE_KEY` only in Supabase secrets.
- Store `PORTAL_MASTER_KEY` only in Supabase secrets (32-byte base64).
- Ensure no `VITE_*` variable contains private credentials.

## Database
- Apply migrations in order:
  1. `20260523_phase1_security_hardening.sql`
  2. `20260523_phase2_security_stabilization.sql`
- Confirm `portal_credentials`, `portal_audit_logs`, and `security_rate_limits` exist.
- Confirm RLS is enabled on all tenant-sensitive tables.

## Edge Functions
- Deploy `portal-secrets`.
- Verify auth header is required and anonymous request fails with 401.
- Verify cross-tenant access fails with 403.
- Verify reveal action enforces rate limit.

## Auth Hardening
- Validate login rate limiting is active client-side.
- Validate secure logout clears browser session storage.
- Validate session refresh runs and expired sessions are invalidated.

## Logging and Monitoring
- Confirm security events write to `audit_logs`.
- Confirm tenant metadata fields (`tenant_id`, `actor_id`, `actor_role`) populate.
- Confirm no stack traces are returned to end users.

## Production Safety
- Remove or block test credentials in any seed docs before public launch.
- Disable development-only UX aids in production builds.
- Run secret scanning in CI before deployment.
