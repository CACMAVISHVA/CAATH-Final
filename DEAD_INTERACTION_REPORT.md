# CAATH Dead Interaction Report

Date: 2026-06-04

## Summary

This pass focused on visible shell-level interactions. The major production risk was not a broken button; it was trusted-looking UI that implied live alerts or operational urgency without live service wiring.

## Fixed Or Removed

| Interaction | Issue | Decision | Status |
|---|---|---|---|
| Middle utility rail icons | Created persistent utility navigation even when not all icons were backed by live workflows | REMOVE | Removed |
| Header notification bell | Duplicated signal entry with drawer and notification route | MERGE | Removed from active shell |
| Floating quick launcher | Duplicated search and operations actions | MERGE | Removed from active shell |
| Operations badge count | Static/fabricated count would reduce production trust | REMOVE | Removed |
| Operations drawer fake alerts | Static alert-like content implied live operational state | FIX | Replaced with workflow actions and outcomes |
| Operations drawer action buttons | Needed visible feedback | KEEP | Loading/success/error feedback retained |
| Sidebar pinned/recent sections | Extra navigation density, passive recent entities | REMOVE | Removed |
| Sidebar deep subsystem links | Low-frequency modules competing with execution routes | MOVE | Moved out of primary nav |

## Remaining Interaction Gaps

| Area | Gap | Severity | Recommended fix |
|---|---|---|---|
| Destination workflow actions | Some command actions dispatch events and rely on destination components to react | High | Add standardized action result/toast contract |
| Dashboard cards | Need full audit for passive cards and non-action widgets | High | Keep only cards that route or filter a workflow |
| Auth create-account role selector | UI implies multiple roles while text says self-service allows Client only | Medium | Restrict selectable roles or make disabled states explicit |
| Command search actions | Some advanced actions route to modules that may not show success/error | Medium | Add action completion telemetry and user feedback |
| Route-level modules | Loading states exist via Suspense; route-specific error/empty states vary | Medium | Normalize empty/loading/error state contract |

## Production Rule

Any visible control must do at least one of:

- navigate to a real workflow
- mutate state with feedback
- open a real data-backed panel
- complete a business task
- expose auditable operational context
