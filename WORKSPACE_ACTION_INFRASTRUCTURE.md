# CAATH Workspace Action Infrastructure

Workspace actions are persisted through `WorkspaceSessionState`.

## Supported Behaviors

- Panel collapse and expand.
- Panel dock and restore.
- Panel maximize and restore.
- Workspace detach and restore.
- Split-view toggle.
- Session restoration through local workspace persistence.

## Accessibility

Panel action buttons include accessible labels and use real `button` semantics. Collapse state is exposed through `aria-expanded`.

## Persistence

Panel states are stored under `panelStates` in the realtime workspace session. This keeps operator layout decisions stable across reloads.
