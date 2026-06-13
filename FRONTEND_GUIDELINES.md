# Frontend Guidelines

## Architecture
- Keep views thin; move business logic to services/use-cases.
- Use repository abstractions for backend access.
- Avoid direct Supabase calls in new UI modules.

## State
- Use isolated stores for auth, tenant, ui, realtime, notifications, analytics-cache.
- Avoid large context objects for frequently changing state.

## Performance
- Default to route-level lazy loading and suspense boundaries.
- Virtualize large table/list renderers.
- Memoize expensive selectors and derived views.

## Observability
- Emit structured logs with trace metadata.
- Emit telemetry events for user actions and performance markers.
