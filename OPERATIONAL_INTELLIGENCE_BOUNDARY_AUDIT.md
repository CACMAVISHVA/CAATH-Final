# Operational Intelligence Boundary Audit (Phase 3.2.5)

Date: 2026-05-24

## Scope
- src/services/operationalAssistanceEngineService.ts
- src/services/roleAwareCommandCenterService.ts
- supporting orchestration/policy/event modules

## Findings

### Clean orchestration systems
- `operationalAssistanceEngineService` is now a compatibility facade delegating to `domains/operations/services/operationalAssistanceOrchestrator`.
- `roleAwareCommandCenterService` is now a compatibility facade delegating to `domains/operations/services/roleAwareCommandCenterOrchestrator`.
- Role-based alert visibility is extracted to `domains/operations/policies/roles/roleAwareVisibilityPolicies.ts`.
- Assistance scoring/visibility policy is extracted to `domains/operations/policies/assistancePolicies.ts`.

### Partially coupled systems
- Orchestrators still aggregate existing legacy service outputs (dashboard/intelligence/revenue/document/etc.), which is acceptable during progressive migration.
- Telemetry publishing still uses current telemetry pipeline abstraction via analytics publisher for compatibility.

### High-risk intelligence coupling zones (pre-refactor state, now reduced)
- Large orchestration methods had mixed role-policy, scoring, and telemetry concern blocks.
- Role filtering logic and operational headline semantics were embedded in command center service.
- Assistance recommendation visibility and ranking logic were embedded in service layer.

## Direct infrastructure coupling status
- No direct `supabase.from()` or direct auth/storage calls in:
  - `src/services/operationalAssistanceEngineService.ts`
  - `src/services/roleAwareCommandCenterService.ts`
  - `src/domains/operations/services/operationalAssistanceOrchestrator.ts`
  - `src/domains/operations/services/roleAwareCommandCenterOrchestrator.ts`

## Boundary compliance summary
- UI -> Service facade -> Domain orchestrator -> service/repository abstractions -> infrastructure
- Operational guidance events are now emitted via typed event contracts.
- Operational metadata is centralized with correlation/trace context.

## Remaining future hardening targets
- Move remaining legacy intelligence aggregators under domain-level adapters to reduce service import breadth.
- Introduce stronger interface contracts for all aggregated snapshots.
- Add unit tests for role visibility policy and recommendation prioritization.
