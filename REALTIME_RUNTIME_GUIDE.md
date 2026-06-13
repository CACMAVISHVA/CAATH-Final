# Realtime Runtime Guide

## Purpose
Enterprise realtime foundation for dashboards, activity streams, live workflow updates, and collaborative channels.

## Core Components
- `RealtimeRuntimeCoordinator`: entry point for subscribe/unsubscribe and recipient resolution.
- `SubscriptionLifecycleManager`: in-memory lifecycle baseline for subscriptions.
- `RealtimeChannelRegistry`: role-aware authorization checks per channel/event.

## Channel Contract
- Every envelope includes: `tenantId`, `channel`, `roleScope`, `correlationId`, `occurredAt`.
- Transport remains abstract (`websocket`, `broker`, `supabase_realtime`).

## Scaling Roadmap
1. Replace in-memory lifecycle with distributed registry (Redis/Postgres).
2. Attach a websocket gateway adapter.
3. Add backpressure and fanout controls.
4. Route hot channels via event broker for multi-region fanout.
