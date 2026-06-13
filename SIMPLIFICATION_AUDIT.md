# CAATH Simplification Audit

Date: 2026-06-04  
Goal: reduce navigation density and prioritize workflow execution over visible subsystem breadth.

## Executive Finding

CAATH had accumulated too many visible control surfaces: sidebar sections, a middle utility rail, a notification bell, floating quick actions, command search, dashboard modules, and route-level workspace panels. Individually these were useful; together they created alert fatigue and diluted the primary workflow path.

The simplification principle for this pass is:

Workflow Execution > Navigation Density

## Navigation Classification

| Surface | Classification | Decision | Reason |
|---|---|---|---|
| Sidebar | KEEP | Simplified to primary workflow areas | Stable navigation is still needed, but only for high-frequency destinations |
| Live Workspace | KEEP | First-priority execution surface | Best candidate for daily operational focus |
| Dashboard | KEEP | Retain as executive summary | Should be concise and not compete with workspace |
| Analytics | KEEP | Retain for review and trend analysis | High-value executive route, lower frequency than execution |
| Task Board | KEEP | Retain in Work | Core execution and SLA management |
| Client Master | KEEP | Retain in Work | Core client operations |
| Document Vault | KEEP | Retain in Work | Evidence and document workflow |
| GST Intelligence | KEEP | Retain in Compliance | High business value for target customer |
| Compliance | KEEP | Retain in Compliance | Core practice control surface |
| Notice Center | KEEP | Retain in Compliance | Deadline and response workflow |
| Approvals | KEEP | Retain in Control | Unblocks governed workflows |
| Governance | KEEP | Retain in Control | Enterprise trust and auditability |
| Billing, Staff, Audit, Security, QA | KEEP | Retain as role-scoped admin | Operational/admin value but not daily execution for everyone |
| Middle utility rail | REMOVE | Removed from shell | Created a second navigation rail and visual clutter |
| Notification bell | MERGE | Merged into Operations drawer concept | Notifications should be one signal type, not separate chrome |
| Floating quick launcher | MERGE | Removed from shell; command search remains | Search already covers fast action execution |
| AI Copilot primary sidebar item | MOVE | Move to command search and contextual drawer | AI should appear in context unless user explicitly searches |
| Team Coordination primary sidebar item | MOVE | Move to drawer/search | Collaboration should surface as work signals and handoffs |
| Command Center primary sidebar item | MOVE | Move to search/shortcut | Redundant with dashboard/workspace/search |
| Automation primary sidebar item | MOVE | Move to search/admin context | Configuration surface, not core daily navigation |
| Autonomous Ops primary sidebar item | MOVE | Move to search/admin context | Oversight workflow, not persistent nav for all |
| Integrations primary sidebar item | MOVE | Move to search/admin context | Admin/system workflow |
| Learning primary sidebar item | MOVE | Move to search/contextual resolution | Useful when solving a case, not as primary nav |
| Pinned sidebar section | REMOVE | Removed from visible sidebar | Adds a second route list and visual noise |
| Recent entities sidebar section | REMOVE | Removed from visible sidebar | Passive and not execution-oriented enough |

## Resulting Visible Model

1. Left sidebar: stable workflow destinations only.
2. Top bar: identity, search, and one Operations button.
3. Right drawer: all operational signals in one contextual surface.
4. Command search: deep routes and advanced actions.

## Remaining Risks

- Some moved routes still exist and may be reachable by command search; they should be audited for action completeness before being promoted again.
- Static drawer signals should be wired to live task, notification, approval, GST, and audit services.
- Dashboard cards still need a separate visual density reduction pass.
