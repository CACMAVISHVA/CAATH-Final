# CAATH Operational Action System

The operational action system lives in `src/domains/action-system/`.

## Core Contracts

- `actionRegistry.ts`: declares known actions, role constraints, cooldown windows, and undoability.
- `useOperationalActionExecutor.ts`: executes actions through a runtime-safe path with deduping, throttling, permission checks, feedback state, and undo support.
- `actionTelemetry.ts`: records action outcomes for reliability review.
- `types.ts`: defines action status, telemetry, results, and registered action contracts.

## Action Lifecycle

1. Validate permission and cooldown.
2. Mark action as loading.
3. Run the operational mutation or navigation.
4. Record success, failure, permission denial, or disabled state.
5. Register undo when a reversible mutation exists.

## Production Rule

Workflow actions should mutate visible operational state immediately, emit feedback, and remain safe against double execution.
