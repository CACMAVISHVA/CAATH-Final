# CAATH Secure Environment Configuration

## Frontend Environment Variables
Allowed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Forbidden in frontend:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORTAL_MASTER_KEY`
- Any private API key, webhook secret, or DB credential

## Edge Function Secrets
Required for `portal-secrets`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORTAL_MASTER_KEY` (base64 string representing exactly 32 bytes)

## Secret Management Policy
- Store all non-public keys in Supabase project secrets.
- Never commit `.env` with production values.
- Rotate `PORTAL_MASTER_KEY` on a scheduled cadence and after incidents.
- Scope service-role usage to edge functions only.

## Runtime Security Defaults
- All portal credential operations run server-side.
- AES-256-GCM encryption/decryption is edge-only.
- Tenant checks run before all sensitive reads/writes.
- Rate limiting is enforced for sensitive actions.
- User-facing errors are sanitized.
