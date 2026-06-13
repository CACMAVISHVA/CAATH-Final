# CAATH Autonomous Operations Architecture

CAATH autonomous operations are governed execution recommendations, not uncontrolled workflow mutation.

## Architecture

- `src/domains/autonomous-operations/`: automation triggers, governance policies, execution plans, timeline and analytics snapshot.
- `src/domains/automation-dashboard/`: operator-facing visibility and approval surface.
- `src/domains/action-system/`: runtime-safe execution, telemetry, throttling and permission checks.

## Principles

- Automation must be explainable before it is executable.
- High-risk automation requires approval.
- Every automation plan carries trigger reason, confidence, policy rationale and lineage.
- Runtime safety is favored over maximum automation speed.

## Runtime Shape

The autonomous orchestrator generates a snapshot of triggers, policies, execution plans and timeline events. The dashboard lets SuperAdmin/Admin users approve, throttle, inspect context or undo local plan state transitions.
