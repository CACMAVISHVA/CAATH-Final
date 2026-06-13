# Operational Insights Guide

## Collaboration Snapshot Flow
1. Orchestrator requests activity and approval datasets via repository.
2. Policy layer applies visibility filtering and role constraints.
3. Orchestrator computes discussion intelligence KPIs.
4. Analytics publisher emits collaboration/latency signals.

## Collaboration Posting Flow
1. Orchestrator resolves visibility policy.
2. Repository persists enterprise discussion activity.
3. Analytics publisher emits collaboration activity event.

## Realtime/Scale Readiness
- Event contracts and metadata support future websocket/event-stream adapters.
- Orchestrator shape is suitable for async queue consumers and incremental fanout.
