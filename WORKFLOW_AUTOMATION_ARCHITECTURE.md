# Workflow Automation Architecture

## Layering
UI/Service facade
-> Workflow Orchestrator
-> Workflow Repositories
-> Infrastructure services (observability/reminders)
-> Supabase

## Core Modules
- `src/domains/workflows/services/workflowAutomationOrchestrator.ts`
- `src/domains/workflows/repositories/WorkflowAutomationRepository.ts`
- `src/domains/workflows/policies/automationPolicies.ts`
- `src/domains/workflows/events/automationEvents.ts`
- `src/domains/workflows/context/workflowMetadata.ts`

## Responsibilities
- Orchestrator: executes automation flow, triggers events, records run telemetry.
- Repository: loads workflow datasets only.
- Policies: owns trigger/rule definitions and evaluation.
- Events: typed automation signal contracts.

## Future Queue Readiness
- Uses `WorkflowJobContract` in workflow interfaces.
- Designed for async scheduler/worker adoption without service rewrites.
