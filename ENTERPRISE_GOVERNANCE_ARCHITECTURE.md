# Enterprise Governance Architecture

CAATH now includes an Enterprise Governance & Operational Trust layer.

This layer is not simplistic RBAC and does not create disconnected audit logs. It provides explainable, contextual governance surfaces over existing workflows, collaboration, approvals, and operational workspaces.

## Locations

- Permission intelligence: `src/domains/permission-intelligence/`
- Governance dashboard: `src/domains/governance-dashboard/`
- Workspace trust snapshot: `GovernanceSnapshot.tsx`
- Command integration: `src/services/commandPaletteService.ts`
- Shortcut integration: `src/domains/command-center/useCommandCenterShortcuts.ts`

## Capabilities

- Role-aware operational visibility.
- Contextual permission evaluation.
- Workflow-state-sensitive access decisions.
- Trust scoring.
- Governance policies and checkpoints.
- Approval chain visibility.
- Auditability panels.
- Accountability surfaces.
- Runtime-safe governance controls.
- Cross-domain governance federation.

