# Workflow Engine Guide

## Implemented Components
- `WorkflowEngineOrchestrator`: template registry, instance creation, transition validation.
- `ProductionWorkflowScenarios`: full business flow runners for GST, onboarding, audit, escalation, approvals.

## Transition Behavior
- Templates define allowed states and escalation-sensitive states.
- Escalation states enqueue follow-up jobs via runtime queue.
- Transition events emit through runtime event service with tenant/correlation IDs.

## Supported Templates
- `gst_notice_lifecycle`
- `client_onboarding`
- `audit_assignment`
- `compliance_escalation`
- `approval_chain`
