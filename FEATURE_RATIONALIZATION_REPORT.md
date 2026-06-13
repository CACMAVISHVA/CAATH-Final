# CAATH Feature Rationalization Report

Date: 2026-06-04

## Visible Feature Classification

| Feature | Classification | Decision |
|---|---|---|
| Live Workspace | KEEP | Primary execution surface |
| Dashboard | KEEP | Executive summary; reduce passive cards |
| Analytics | KEEP | Review surface for trends and performance |
| Task Board | KEEP | Core work execution |
| Client Master | KEEP | Core client operations |
| Document Vault | KEEP | Evidence and document workflow |
| GST Intelligence | KEEP | High-value domain workflow |
| Compliance | KEEP | Core compliance control |
| Notice Center | KEEP | Deadline and notice response workflow |
| Approvals | KEEP | Governance unblocker |
| Governance | KEEP | Auditability and enterprise trust |
| Admin tools | KEEP | Role-scoped operational controls |
| Operations drawer | KEEP | Single contextual workflow action area |
| Header Search | KEEP | Fast command and entity access |
| Utility rail | REMOVE | Screen cost not justified without live workflow-backed icons |
| Notification bell | MERGE | Consolidate future notifications into Operations drawer |
| Floating quick launcher | MERGE | Search and drawer cover its purpose |
| Sidebar pinned/recent navigation | REMOVE | Adds route-list duplication |
| AI Copilot primary sidebar placement | MOVE | Keep accessible through search/context until live action value is proven |
| Command Center primary sidebar placement | MOVE | Useful conceptually, but duplicates dashboard/workspace/search |
| Automation/Autonomous/Integrations/Learning primary placement | MOVE | Valuable but lower-frequency; keep search/admin/context access |

## Value Density Rule

Persistent navigation is reserved for daily or weekly workflows with direct business value. Everything else must earn visibility through context, search, or admin scope.

## Recommended Production Baseline

First enterprise deployment should expose:

- Focus: Workspace, Dashboard, Analytics
- Work: Tasks, Clients, Documents
- Compliance: GST, Compliance, Notices
- Control: Approvals, Governance
- Administration: role-scoped controls
