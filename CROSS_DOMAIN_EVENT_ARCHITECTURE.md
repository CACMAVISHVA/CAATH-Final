# Cross-Domain Event Architecture

## Architecture Goals
- Decouple domain modules while preserving unified enterprise behavior
- Route events through shared contracts and runtime governance
- Correlate operational activity across GST, AI, predictive, workflow, and compliance lanes

## Event Flow
1. Domain emits a `FabricEvent` into `OperationalIntelligenceFabricOrchestrator.routeEvent`.
2. `RuntimeFederationGovernance` validates permission-aware routing.
3. `PerformanceAwareFederationRuntime` applies dedupe and throughput throttling.
4. `OperationalContextEngine` updates shared operational context.
5. `CrossDomainIntelligenceBus` publishes into fabric subscribers and runtime bus.
6. Correlation, timeline, graph, search, and executive snapshots consume federated events.

## Contracts
- Event type: `FabricEvent`
- Domain envelope: `FabricDomain`
- Correlation key: `correlationId`
- Governance lineage: `tenantId:correlationId:domain:eventName`

## Operational Safety
- Prevents event storms with tenant-level throttle window
- Blocks duplicated event propagation using id and correlation dedupe
- Preserves audit-safe lineage for each routed event

## Federation Principles
- No direct domain-to-domain hard coupling
- No duplicated intelligence logic per domain
- Orchestration first, rendering second
