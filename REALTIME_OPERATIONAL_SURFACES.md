# Realtime Operational Surfaces

The realtime workspace creates a live operational feel without introducing new backend systems.

## Surface Inventory

- Live task panels.
- Realtime notice panels.
- AI intelligence surfaces.
- Escalation panels.
- Workflow activity panels.
- Operational alert panels.
- Collaboration comments and mentions.
- Timeline and replay-ready activity history.

## Design System Extensions

Added to `src/design-system/index.tsx`:

- `WorkspacePanel`
- `DockRail`
- `ActivityIndicator`
- `TimelineList`

These primitives support consistent panel framing, docking, live indicators, and event timeline rendering across future workspace surfaces.

## Performance UX

The workspace uses lazy route loading, compact panel rendering, optimistic local action state, and high-density table/panel patterns. These are frontend performance patterns only and remain compatible with existing realtime runtime systems.

