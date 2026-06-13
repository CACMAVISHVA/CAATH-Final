# Workflow State Transitions

## Foundation
State machine utilities live in:
- `src/domains/workflows/state-machine/workflowStateMachine.ts`
- `src/services/workflowEngineService.ts` (transition rules + role guards)

## Transition Guarding
- Domain/workflow orchestrators consult workflow transition guard before interpreting lifecycle flows.
- Invalid transitions are flagged as critical integrity findings.

## Near-Term Strategy
- Keep current guard tables and role overrides.
- Add policy-driven transition packs per domain as workflows grow.

## Future Strategy
- Promote to configurable transition registry and workflow designer integration.
- Keep validation deterministic and replay-safe for async jobs.
