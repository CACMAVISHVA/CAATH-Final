# Event Orchestration Guide

## Event Contracts
File: `src/domains/workflows/events/workflowEvents.ts`

Defined workflow event names:
- `TASK_ACTIVITY_CREATED`
- `NOTICE_STATUS_CHANGED`
- `CLIENT_ASSIGNED`
- `GST_DEADLINE_TRIGGERED`

## Emission Pattern
1. Domain workflow service executes business step.
2. Repository commits persistence.
3. Service emits typed workflow event with tenant/actor context.

## Tenant Metadata
Use `requireTenantContext(user)` from `context/tenantContext.ts` to standardize:
- `firmId`
- `actor.id`
- `actor.role`

## Future Queue Strategy
- `WorkflowJobContract` in `interfaces/IWorkflowOrchestrator.ts` defines queue-safe payload contract.
- Async workers can subscribe to workflow events and enqueue retryable jobs.
- Keep services idempotent by basing replay on event payload IDs and actor/tenant context.
