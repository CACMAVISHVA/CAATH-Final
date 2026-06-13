# Operational Intelligence Architecture

## Purpose
Provide modular operational intelligence orchestration without creating monolithic services.

## Layering
1. UI and components call compatibility services in `src/services/*`.
2. Compatibility services delegate to orchestrators in `src/domains/operations/services/*`.
3. Orchestrators compose business context using existing domain/intelligence service abstractions.
4. Events and telemetry are emitted through dedicated abstractions:
- `src/domains/operations/events/operationalGuidanceEvents.ts`
- `src/domains/analytics/services/analyticsEventPublisher.ts`

## Key Modules
- `operationalAssistanceOrchestrator`
- `roleAwareCommandCenterOrchestrator`
- `assistancePolicies`
- `roleAwareVisibilityPolicies`
- `operationalMetadata`

## Scalability Benefits
- Prevents operational god-services by separating policy from orchestration.
- Supports future AI-assisted recommendations by isolating recommendation coordination.
- Preserves backward compatibility with service facades while enabling iterative migration.

## Maintainability Benefits
- Role and assistance logic are centrally defined and reusable.
- Event contracts make integrations explicit and easier to evolve safely.
- Correlation and trace metadata are standardized for observability.

## Future Architecture Benefits
- Enables queue/background trigger integration without changing UI contracts.
- Supports policy versioning and tenant/plan-specific behavior rollout.
- Provides clear seams for extracting operational intelligence into microservices later.
