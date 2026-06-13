# Runtime Infrastructure Architecture

## Runtime Topology
- `src/runtime/notifications`: notification orchestration, routing, prioritization, retries.
- `src/runtime/realtime`: channel/subscription lifecycle and role-aware delivery boundaries.
- `src/runtime/jobs`: queue orchestration, worker lifecycle, retries, dead-letter support.
- `src/runtime/observability`: telemetry, tracing, anomaly hooks, correlation IDs.
- `src/runtime/audit`: append-only audit pipeline and compliance retention policies.
- `src/runtime/ai`: prompt governance, masking, AI safety, usage telemetry.
- `src/runtime/events`: centralized runtime event governance and replay foundations.
- `src/runtime/configuration`: feature flags, runtime toggles, policy injection.
- `src/runtime/telemetry`: health scoring and orchestration performance telemetry.
- `src/runtime/security`: suspicious activity signals and tenant risk intelligence.

## Architectural Strategy
- Runtime modules are intentionally decoupled and communicate using typed envelopes containing `tenantId`, `correlationId`, and timestamps.
- No runtime module directly depends on UI concerns.
- No runtime module requires immediate external infrastructure binding; adapters are introduced at edges.

## Distributed Readiness
- Event and job abstractions are designed for future brokers (Kafka/NATS) and queues (BullMQ/Redis).
- Realtime runtime contracts are transport-agnostic for future Supabase Realtime and WebSocket gateways.
- Observability contracts align with OpenTelemetry primitives (trace/span/metric/signal).

## Migration Path
1. Keep existing services operational.
2. Move orchestration concerns into `src/runtime/*` modules incrementally.
3. Attach provider adapters (email/SMS/push, queue backends, telemetry exporters) without changing domain contracts.
4. Promote runtime policies into tenant-aware configuration.
