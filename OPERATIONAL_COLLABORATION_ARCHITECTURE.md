# Operational Collaboration Architecture

## Layering
Service Facade
-> Operations Orchestrator
-> Operations Repository
-> Infrastructure (Supabase)

Analytics path:
Operations Orchestrator
-> Analytics Event Publisher
-> Telemetry Infrastructure

## Modules
- `src/domains/operations/services/operationalCollaborationOrchestrator.ts`
- `src/domains/operations/repositories/OperationalCollaborationRepository.ts`
- `src/domains/operations/policies/collaborationPolicies.ts`
- `src/domains/analytics/services/analyticsEventPublisher.ts`
- `src/domains/analytics/events/analyticsEvents.ts`

## Boundary Guarantees
- Collaboration orchestration no longer performs direct DB access.
- Analytics publication no longer embedded as ad-hoc calls in legacy operational service.
- Visibility and policy logic moved to operations policy layer.
