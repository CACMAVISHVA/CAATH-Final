# Realtime Event System

## Foundation
- Contracts: `src/infrastructure/realtime/realtimeContracts.ts`
- Registry: `src/infrastructure/realtime/subscriptionRegistry.ts`
- Policy: `src/infrastructure/realtime/tenantChannelPolicy.ts`

## Design
- Tenant-aware channel naming.
- Role-aware subscription checks.
- Envelope-based event transport with correlation IDs.

## Supported Future Modes
- Websocket fanout
- Server-sent events
- Stream adapter (Kafka/NATS equivalent)

## Guardrails
- No cross-tenant channel access.
- Client roles cannot subscribe to admin-only channels.
