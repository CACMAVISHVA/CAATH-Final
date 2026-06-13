# Realtime Workspace Architecture

CAATH now includes an Enterprise Realtime Operational Workspace layer for persistent operator execution.

This phase is UI and workspace-surface focused. It does not add backend-heavy intelligence systems or new orchestration engines.

## Location

- Domain: `src/domains/workspace-shell/`
- Main surface: `RealtimeWorkspaceShell.tsx`
- Persistence: `workspacePersistence.ts`
- Contracts: `types.ts`

## Shell Capabilities

- Persistent workspace shell.
- Workspace tabs.
- Multi-panel operational layout.
- Dock rail for live panels.
- Contextual side panels.
- Saved layout state in local workspace persistence.
- Recent sessions and pinned operational views.

## App Integration

The workspace is exposed through the `workspace` tab and is now the role home for `SuperAdmin`, `Admin`, and `Staff`.

The Command Center remains available as the operational overview, while the Realtime Workspace is the execution cockpit.

