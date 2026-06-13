# CAATH Security Hardening - Phase 1

## 1. Encryption Architecture
- Portal credential encryption moved from browser-side reversible encoding to server-side `AES-256-GCM`.
- New Supabase Edge Function: `supabase/functions/portal-secrets`.
- Frontend no longer has encryption keys and does not decrypt credentials.
- `PORTAL_MASTER_KEY` (32-byte base64 key) is required in Edge Function environment variables.
- Each encryption operation uses a cryptographically secure random IV and authenticated ciphertext.

## 2. Auth and Boundary Flow
- New secure flow:
  1. Frontend calls `supabase.functions.invoke('portal-secrets')`.
  2. Edge Function validates bearer JWT using authenticated Supabase client.
  3. Function resolves actor profile from `public.users` and enforces active status.
  4. Sensitive operation executes only server-side with service-role client.
  5. Audit entry is written for every sensitive access and mutation.

## 3. Tenant Isolation Strategy
- Tenant enforcement is server-side and RLS-backed.
- `portal_credentials` records are scoped by `firm_id`.
- Cross-tenant access checks are performed in Edge Function before any read/write/decrypt.
- `GodAdmin` is isolated by explicit role check; non-platform users are hard-bound to their JWT firm context.

## 4. RLS Strategy
- Added migration: `supabase/migrations/20260523_phase1_security_hardening.sql`.
- RLS enabled and policies created for:
  - `portal_credentials`
  - `portal_audit_logs`
  - restrictive tenant guardrails on `documents`, `billing`, `audit_logs`
- Conditional hardening included for optional tables:
  - `tickets` (if exists)
  - `gst_modules` (if exists)
- Policy basis follows tenant claim matching:
  - `firm_id::text = auth.jwt()->>'firm_id'`
  - plus explicit `GodAdmin` exception.

## 5. Secret Management Policy
- Removed frontend key pattern for portal encryption.
- Disabled insecure client-side dev seeding pattern that expected service-role keys in VITE env.
- Secrets must only exist in server-side environment:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `PORTAL_MASTER_KEY`

## 6. Audit Logging Model
- Audit entries now support immutable security metadata:
  - `actor_id`
  - `actor_role`
  - `tenant_id`
  - `ip_metadata`
  - `device_metadata`
- Edge Function writes audit logs for:
  - create/update/delete/reveal portal credentials
  - portal launch access
  - filing event updates
  - denied/invalid attempts (via request validation failures)

## 7. Frontend Security Risk Remediation
- Removed browser credential encryption/decryption usage.
- Replaced direct sensitive table mutations with function boundary.
- Removed plaintext dev password helpers from login UI.
- Disabled insecure client-side admin seeding service.
- Added reusable security utility layer in `src/security/`.

## 8. Scalability Benefits
- Security controls centralized in one callable boundary (`portal-secrets`) for easier reuse by mobile/apps/microservices.
- RLS and server-side policy model scale with tenant growth and multi-region deploys.
- Audit schema now supports downstream SIEM/forensics integrations.

## 9. Operational Notes
- Apply migration before deploying frontend.
- Deploy Edge Function and set environment variables securely.
- Rotate `PORTAL_MASTER_KEY` via scheduled key-rotation design in Phase 2 (envelope encryption recommended).
- Add automated policy tests to CI for tenant-bound data access assertions.
