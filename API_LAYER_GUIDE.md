# API Layer Guide

## Central API Client
Path: `src/infrastructure/api/requestClient.ts`

## Features
- Typed request contract.
- Auth token injection from active session.
- Request tracing via `X-Trace-Id`.
- Retry handling including `429` rate-limit backoff.
- Standardized `ApiError` semantics.
- Request/response interceptor registration.

## Usage Pattern
1. Domain service composes request payload DTO.
2. Repository/API adapter calls `requestClient.request<TResponse>()`.
3. Domain service maps response DTO to UI-safe model.
4. UI consumes domain service only.

## Error Handling
- Infrastructure throws `ApiError`.
- Domain services map/normalize to `AppError` hierarchy for UI-safe messages.

## Versioning
- Version-aware URL composition from `shared/config/appConfig.ts`.
- Default path pattern: `/{version}/{resource}` when `VITE_API_BASE_URL` configured.

## Progressive Adoption Rule
- No new direct `fetch`/Supabase access in UI components.
- Existing direct calls should be migrated through repository/domain service façades.
