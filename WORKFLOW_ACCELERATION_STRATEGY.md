# Workflow Acceleration Strategy

This phase improves execution speed without adding new workflow engines.

## Acceleration Patterns

- Bulk selection in enterprise tables.
- Mass assignment controls.
- Quick approval actions.
- One-click resolution affordances.
- Keyboard workflow hotkeys.
- Command palette actions.
- Pinned workflows.
- Recent entity navigation.

## Where It Lives

- Command actions: `src/services/commandPaletteService.ts`
- Keyboard bindings: `src/domains/command-center/useCommandCenterShortcuts.ts`
- Command Center table and shortcuts: `src/domains/command-center/EnterpriseCommandCenter.tsx`
- Design-system table primitive: `src/design-system/index.tsx`

## Success Measures

- Operators can find a client, GSTIN, task, notice, approval, document, or workflow from Ctrl+K.
- Operators can act on multiple rows from a single table state.
- Approvers can open and release approval work from hotkeys or the Command Center.
- Team leads can move from SLA alert to assignment action without page switching.

