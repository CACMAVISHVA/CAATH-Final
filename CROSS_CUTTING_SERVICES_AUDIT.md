# Cross-Cutting Services Audit (Phase 3.2.2)

Audit date: 2026-05-24
Scope:
- taskActivityService
- workflow helpers
- orchestration services
- notification coordinators
- automation helpers
- analytics workflow hooks

## Pure Workflow Services
- `src/services/workflowEngineService.ts`
  - Pure transition/rule logic; no infrastructure coupling.
- `src/domains/workflows/services/taskActivityWorkflowService.ts`
  - Orchestration-only, repository-backed.

## Partially Coupled Services
- `src/services/workflowAutomationService.ts`
  - Mixes orchestration/business logic with direct data queries.
- `src/services/workflowLifecycleIntegrityService.ts`
  - Strong analysis logic but still coupled to direct persistence layer.
- `src/services/enterpriseOrchestrationService.ts`
  - Event/orchestration + direct infrastructure writes.
- `src/services/enterpriseIntegrationOrchestrationService.ts`
  - Integration orchestration with direct infrastructure access.

## High-Risk Orchestration Areas
- `taskActivityService` (pre-refactor) had direct inserts/selects + business logic mixed.
- Workflow automation and lifecycle integrity services run cross-domain queries directly.
- Event persistence/orchestration services include mixed transport and behavior concerns.

## Tenant/Actor Risks Observed
- Tenant resolution logic appears in multiple services.
- Actor metadata assembly repeated across several workflow paths.

## Migration Action Taken in this Sprint
- Purified `taskActivityService` via `domains/workflows` orchestration and repository isolation.
- Added centralized tenant context helper and typed workflow event emitter.
- Added workflow interfaces/contracts for future queue/background execution.
