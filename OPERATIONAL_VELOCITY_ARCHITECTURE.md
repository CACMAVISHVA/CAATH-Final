# Operational Velocity Architecture

CAATH now includes an Enterprise Operational Velocity layer over the realtime workspace.

This layer is focused on interaction speed, command access, action memory, queue traversal, and perceived responsiveness. It does not introduce new backend intelligence engines or orchestration systems.

## Locations

- Velocity memory: `src/domains/operational-velocity/`
- Workspace integration: `src/domains/workspace-shell/RealtimeWorkspaceShell.tsx`
- Command system: `src/services/commandPaletteService.ts`
- Hotkeys: `src/domains/command-center/useCommandCenterShortcuts.ts`
- Design primitives: `src/design-system/index.tsx`

## Core Capabilities

- Global command palette entry through Ctrl+K.
- Rapid action clusters.
- Queue traversal with keyboard-friendly selection.
- SLA and queue pressure overlays.
- AI-assisted next-action surfaces.
- Workspace action memory.
- Interaction analytics and productivity scoring.
- Focused operational modes.

