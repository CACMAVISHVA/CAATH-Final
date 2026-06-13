# CAATH Navigation Simplification Plan

Date: 2026-06-04

## Navigation Model

CAATH should use four levels of navigation:

1. Sidebar: stable product areas.
2. Utility rail: cross-workspace interrupts and tools.
3. Command search: fast access to routes, records, and actions.
4. In-workspace tabs/panels: local workflow views only.

## Sidebar Model

| Section | Purpose | Includes |
|---|---|---|
| Command | Executive and workspace entry | Dashboard, Live Workspace, Command Center, Analytics |
| Execution | Daily operating work | Tasks, Compliance, GST, Clients, Notices, Documents |
| Coordination | Team and AI assistance | Team Coordination, AI Copilot |
| Control | Governance and admin oversight | Governance, Approvals, Autonomous Ops, Integrations |
| Enablement | Learning and automation | Learning, Automation |
| Administration | Practice/admin functions | Payroll, Billing, Staff, Audit, Security, QA |

## Utility Rail Model

| Utility | Purpose | Required behavior |
|---|---|---|
| Notifications | Action-ready inbox | Opens panel, routes to notices/documents/notifications |
| Alerts | Risk signals | Opens panel, routes to GST/task risk |
| Escalations | Approval/ownership exceptions | Opens panel, routes to approvals/handoffs |
| Collaboration | Mentions and team queue | Opens panel, routes to collaboration workflows |
| AI Recommendations | Governed suggestions | Opens panel, dispatches AI/work reassignment actions |
| Operational Timeline | Recent events and recovery | Opens panel, restores workflow/audit trail |
| Workspace Tools | Search/focus/triage tools | Opens panel, changes workspace state |

## Reductions Completed

- Removed duplicate Notifications and AI Foundation from primary sidebar visibility.
- Grouped routes by business intent instead of architecture category.
- Shifted alerts/recommendations/timeline/tools into the operational rail.

## Further Reductions

1. Promote Live Workspace as the default post-login area for internal users once dashboard cards are action-backed.
2. Merge NotificationBell, notification center, and rail notification data into one notification model.
3. Move low-frequency admin controls behind Control or command search.
4. Remove any dashboard widget that does not route to a workflow.
5. Keep no more than 3-5 executive metrics visible above the fold.

## First Enterprise Customer Navigation Standard

A new user should understand within 30 seconds:

- where daily work happens
- where risk is surfaced
- where approvals are handled
- where client/document evidence lives
- where to search or issue commands
