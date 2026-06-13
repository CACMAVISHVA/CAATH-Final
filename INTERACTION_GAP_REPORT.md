# CAATH Interaction Gap Report

Date: 2026-06-04

## Readiness Standard

Every visible action should:

- execute a real workflow or navigation
- update state
- provide loading feedback
- provide success feedback
- provide error feedback
- preserve user context where appropriate

## Current Gaps

| Surface | Gap | Severity | Fix |
|---|---|---|---|
| Utility rail | Previously decorative/non-operational icon behavior | High | Fixed with persisted panels and action feedback |
| Command palette actions | Navigation actions work, but not all destination workflows show completion feedback | Medium | Add destination-level toasts/state |
| QuickActionLauncher | Likely overlaps with command palette and rail tools | Medium | Keep as compact launcher; remove any duplicated decorative actions |
| Dashboard cards | Some cards may be informational without action | Medium | Require every dashboard card to link to a route, filter, or resolution workflow |
| Architecture module pages | Some are control/foundation surfaces rather than workflows | Medium | Move behind admin/search or convert controls to operational tasks |
| NotificationBell | Needs clear relationship to notification route and utility rail | Medium | Bell opens unread inbox; rail shows action queue |
| Recent entities in sidebar | Passive list with no visible action beyond display | Low | Convert each entity to clickable destination or remove |
| Pinned entries | Operational if target routes are valid | Low | Keep; add invalid target handling |
| Login create account | Role selector says self-service allows Client only while selector shows all roles | Medium | Restrict options or enforce visible disabled roles |

## Completed Fixes

- Utility rail icons now open panels.
- Active utility panel persists in local storage.
- Rail actions show loading and success states.
- Rail actions dispatch existing command actions or open search.
- Sidebar visible nav has been rationalized around product workflows.

## Required Next Fixes

| Priority | Action |
|---|---|
| P0 | Add integration tests for utility rail action dispatch and active state persistence |
| P0 | Ensure TaskBoard quick actions create/assign/reassign show toast success/error |
| P1 | Add dashboard card action audit and remove passive widgets |
| P1 | Add empty/loading/error states to every route-level dashboard |
| P1 | Convert sidebar recent entities into clickable, typed targets |
| P2 | Normalize all command actions through a shared action result contract |

## Enterprise Trust Rule

Any control that cannot produce a clear state change, navigation, or workflow result should be removed from the visible UI until it can.
