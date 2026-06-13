# Role-Aware Coordination Guide

## Boundary
Role awareness belongs in policy modules, not orchestration core and not UI components.

## Current Policy Modules
- `src/domains/operations/policies/roles/roleAwareVisibilityPolicies.ts`
  - alert visibility filtering by role
  - role headline mapping for command center summaries

## Coordination Flow
1. Orchestrator gathers multi-domain context.
2. Policy layer filters and shapes role-visible alerts.
3. Orchestrator computes urgency and summary metrics.
4. Event layer emits role context update signals.

## Why this matters
- Scalability: role rules can expand (new enterprise roles) without rewriting orchestration.
- Maintainability: avoids duplicated role condition branches across services.
- Future readiness: supports role-policy engines and tenant-specific role customization.
