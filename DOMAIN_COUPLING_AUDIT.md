# Domain Coupling Audit (Phase 3.2)

## Scope
Domains audited: `tasks`, `notices`, `clients`.
Audit date: 2026-05-24.

## Direct Coupling Findings
- `tasks`: heavy direct table access across `tasks`, `users`, `clients`, `task_reassignments`, `audit_logs`.
- `notices`: direct access to `notices`, `users`, `audit_logs` and cross-workflow coupling to tasks.
- `clients`: direct access to `clients`, `audit_logs`; validation logic embedded in service layer.

## High-Risk Workflow Chains
- Notice lifecycle -> Task lifecycle synchronization.
- Task reassignment + workload metrics + role constraints.
- Client onboarding uniqueness checks (PAN) + tenant scope checks.

## Hidden Dependency Areas
- Shared workflow transition rules (`workflowEngineService`) consumed by tasks and notices.
- Shared audit/event/telemetry side effects embedded in task/notice service operations.
- Staff/admin selection logic duplicated in task and notice contexts.

## Low-Risk Migration Areas
- Read-only list and detail queries in clients/tasks/notices.
- DTO/mapping normalization and query key standardization.

## Migration Safety Strategy
- Preserve existing import paths by introducing compatibility facades.
- Relocate business logic into domain services first.
- Keep UI behavior unchanged while reducing coupling in progressive steps.
