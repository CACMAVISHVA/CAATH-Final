# Event Runtime Architecture

## Purpose
Centralized runtime event governance layer with lifecycle validation, routing, correlation, and replay foundations.

## Core Components
- `RuntimeEventBus`: publish/list event lifecycle.
- `EventLifecycleCoordinator`: validation and lifecycle guardrails.
- `TenantAwareEventRouter`: tenant-scoped listener routing.
- `EventCorrelationManager`: correlation grouping for investigations.
- `EventReplayFoundation`: replay-ready ordered event slices.

## Versioning Preparation
- Runtime events include a `version` field.
- New contracts should evolve with additive changes first.
- Upcasters can be attached at publish/replay boundaries later.

## Distributed Roadmap
1. Add broker adapter (Kafka/NATS).
2. Add partition strategy by tenant and event class.
3. Add durable replay cursor checkpoints.
