# Operational Assistance Engine Guide

## Objective
Coordinate operational assistance recommendations without coupling recommendations to infrastructure concerns.

## Current Structure
- Facade: `src/services/operationalAssistanceEngineService.ts`
- Orchestrator: `src/domains/operations/services/operationalAssistanceOrchestrator.ts`
- Policies: `src/domains/operations/policies/assistancePolicies.ts`
- Events: `src/domains/operations/events/operationalGuidanceEvents.ts`
- Metadata: `src/domains/operations/context/operationalMetadata.ts`

## Behavior
- Build recommendation set from predictive, revenue, integrity, and document context.
- Apply role visibility policy.
- Apply deterministic priority ranking policy.
- Emit operational assistance event and telemetry through abstractions.

## Architectural Benefits
- Scalability: recommendation engine can evolve toward ML/AI scoring without UI contract changes.
- Maintainability: policy tuning is isolated from aggregation plumbing.
- Future architecture: supports asynchronous recommendation pipelines and event-triggered automation.
