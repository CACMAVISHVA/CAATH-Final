# CAATH Enterprise Operational Experience

CAATH now treats the authenticated workspace as an Enterprise Operational Experience Platform: a command-center operating surface for chartered accountancy firms.

This phase does not add new intelligence engines, simulation systems, or orchestration layers. It packages existing operational capabilities into faster operator workflows.

## Experience Pillars

- Single-screen control through the Command Center.
- Keyboard-first navigation through Ctrl+K and workflow hotkeys.
- Role-aware navigation with pinned and recent entities.
- Personal cockpit views for tasks, notices, clients, approvals, alerts, and intelligence.
- Dense enterprise tables with saved-view, filter, export, inline-action, and bulk-operation affordances.
- Context panels that expose client, GST, task, risk, and insight summaries without page switching.
- Executive surfaces for KPI, risk, workload, SLA, and intelligence visibility.

## Implemented Surfaces

- `src/domains/command-center/EnterpriseCommandCenter.tsx`
- `src/design-system/index.tsx`
- Updated `src/App.tsx` tab routing with `eox` as the internal-user home.
- Updated `src/components/Sidebar.tsx` for workspace navigation, pinned entities, and recent entities.
- Updated command palette actions and keyboard shortcuts.

## Operator Outcomes

- Less navigation friction.
- Fewer clicks for assignment, approval, search, and resolution.
- Faster awareness through grouped notifications and activity streams.
- Better perceived speed through lazy-loaded command-center entry and reusable skeleton-ready primitives.

