# Collaboration Boundaries

## Operational Domain Scope
- discussion thread orchestration
- activity feed coordination
- role-based visibility policy
- collaboration intelligence aggregation

## Analytics Domain Scope
- analytics event contracts
- telemetry publication
- analytics metadata assembly

## Non-Goals
- direct business-domain mutation from analytics pipelines
- direct infrastructure queries from orchestration services

## Compatibility
- `src/services/operationalCollaborationService.ts` remains a stable façade.
- Existing callers remain unchanged while internals follow modular boundaries.
