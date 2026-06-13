# Workflow Architecture

## New Workflow Domain Layer
Path: `src/domains/workflows/`

## Modules
- `context/tenantContext.ts`
  - Standard tenant + actor metadata extraction.
- `events/workflowEvents.ts`
  - Typed workflow event contracts and emitter.
- `interfaces/ITaskActivityRepository.ts`
  - Activity/comment repository contract.
- `interfaces/IWorkflowOrchestrator.ts`
  - Generic orchestrator and future job contract.
- `repositories/TaskActivityRepository.ts`
  - Infrastructure persistence adapter.
- `services/taskActivityWorkflowService.ts`
  - Business orchestration for task activity/comments.
- `orchestrators/notificationWorkflowOrchestrator.ts`
  - Notification orchestration isolation.

## Compatibility Strategy
- Legacy `src/services/taskActivityService.ts` is now a thin compatibility façade.
- Existing callers remain unchanged.

## Queue/Event Readiness
- `WorkflowJobContract` added for future async queue runner integration.
- Event contracts are typed and reusable for automation pipelines.
