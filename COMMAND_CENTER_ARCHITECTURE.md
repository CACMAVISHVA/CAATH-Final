# Command Center Architecture

The Command Center is the unified operational home for CAATH operators.

## Location

- Domain: `src/domains/command-center/`
- Main UI: `EnterpriseCommandCenter.tsx`
- Existing command runtime: `CommandCenterOrchestrator.ts`
- Shortcut hook: `useCommandCenterShortcuts.ts`

## Responsibilities

- Personal work queue.
- Priority inbox.
- AI recommendations feed based on existing command and operational recommendation capabilities.
- SLA and escalation alerts.
- Pending approvals.
- Operational shortcuts.
- Activity stream.
- Context panels.
- Executive wall metrics.

## Shell Integration

`src/App.tsx` lazy-loads the Command Center and renders it for `SuperAdmin`, `Admin`, and `Staff` through the `eox` tab.

Role home now points internal users to `eox`, while `GodAdmin` and `Client` continue using their specialized surfaces.

## Navigation Contract

The Command Center receives:

- `user`
- `pins`
- `recentNavigation`
- `onNavigate`
- `onOpenSearch`
- `onCommandAction`

This keeps the Command Center an experience layer over existing modules rather than a new orchestration system.

