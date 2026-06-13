# Permission Intelligence System

Permission intelligence evaluates operational access using role, workspace, workflow state, sensitivity, and escalation context.

## Explainable Decisions

Every decision includes:

- Decision outcome.
- Reasoning.
- Access context.
- Workflow state.
- Operational impact.
- Permission lineage.
- Governance traceability.
- Trust score.

## Current Implementation

`evaluateOperationalPermission` lives in `src/domains/permission-intelligence/permissionIntelligenceCore.ts`.

The system is frontend/domain-level and explainable. It does not tightly couple permission checks to workflow execution engines.

## Context Inputs

- User role.
- Workspace scope.
- Workflow governance state.
- Sensitivity level.
- Escalation status.

