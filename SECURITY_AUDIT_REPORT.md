# CAATH Security Audit Report (Phase 2)

Date: 2026-05-23
Scope: React + TypeScript + Vite + Supabase + Edge Functions

## Executive Summary
- Phase 1 controls were partially correct but had operational gaps (unsafe error exposure, no request schema validation, no server-side rate limit).
- Phase 2 added centralized security middleware, runtime validation, safe error boundaries, and DB-backed edge rate limiting.
- Current state is materially improved and suitable for controlled production rollout with remaining remediation items tracked below.

## Verified Controls
1. Encryption model
- Verified `portal-secrets` uses AES-GCM with 12-byte random IV and authenticated encryption.
- Verified encryption key is loaded from edge secret `PORTAL_MASTER_KEY` only.
- Verified decrypt path exists only in edge function.

2. Frontend secret exposure
- Verified portal encryption key is no longer read from `VITE_*`.
- Verified client-side seed service no longer uses service-role key in frontend runtime.
- Added `.env.example` with only public-safe vars.

3. Tenant boundaries
- Verified edge path enforces actor firm context and explicit cross-tenant deny.
- Added/updated restrictive RLS controls for sensitive and missed tables.

4. Authentication hardening
- Added login attempt client throttling.
- Added periodic session refresh handling.
- Preserved secure logout/session cleanup behavior.

5. Runtime validation
- Added equivalent runtime schema validation utilities (UUID/string/URL checks) and integrated into sensitive paths.
- Added edge payload validation and hard fail for malformed inputs.

6. Rate limiting
- Added `security_rate_limits` table and edge-enforced limits for:
  - global portal-secrets usage
  - credential creation
  - credential reveal
- Added client-side throttles for login and support ticket actions.

## Vulnerabilities Fixed
1. Sensitive internal error leakage from edge function
- Fix: centralized secure error mapping (`toSafeErrorResponse`) now returns sanitized messages.

2. Missing request schema validation in edge function
- Fix: strict field validation for action, UUIDs, strings, HTTPS URLs.

3. Missing server-side rate limit for credential secrets
- Fix: DB-backed rate limiter with scope+actor+window controls.

4. Hardcoded demo password strings in docs/seed guidance
- Fix: replaced plaintext password literals with redacted placeholders.

5. Weak/no centralized security middleware architecture
- Fix: added reusable security layer for auth/tenant/permissions/errors/validation/rate-limit.

## Remaining Risks
1. Legacy console error statements across UI/services
- Risk: low/moderate (diagnostic leakage in browser console).
- Recommendation: migrate to centralized safe logger and redact error internals.

2. Seed artifacts still include static demo identities
- Risk: low if non-production; moderate if reused in production.
- Recommendation: keep seed scripts non-production and require environment-scoped identities.

3. Client-side rate limit can be bypassed
- Risk: expected; client throttle is UX protection only.
- Recommendation: keep server-side enforcement as source of truth (already done for portal secrets) and extend to other edge endpoints.

4. Support tickets and other business services still rely on direct table calls
- Risk: medium if future endpoints bypass server guardrails.
- Recommendation: move high-risk mutations to edge wrappers with shared middleware.

## Architecture Weaknesses
1. Security logic still split between frontend services and edge for non-portal domains.
2. Multiple legacy service modules still implement ad-hoc error handling.
3. Not all security telemetry paths are normalized to one event pipeline yet.

## Recommendations
1. Expand shared edge middleware to all sensitive domains (`tickets`, `billing`, `admin workflows`, `AI actions`).
2. Replace ad-hoc `console.error` usage with security-safe logger + correlation IDs.
3. Add CI checks:
- banned pattern scan for secrets/password literals
- RLS diff checks
- edge validation tests
4. Add session/device inventory table for advanced session risk controls.
5. Add key rotation workflow (envelope encryption and re-encrypt job).
