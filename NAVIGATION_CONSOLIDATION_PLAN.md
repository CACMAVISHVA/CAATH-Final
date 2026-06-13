# CAATH Navigation Consolidation Plan

Date: 2026-06-04

## Target Navigation Model

One clear model:

- Sidebar for stable, high-frequency destinations.
- Header Search for deep access and commands.
- Operations drawer for contextual workflow actions.
- Workspace internals for local task execution.

No permanent utility rail. No duplicate quick launcher. No separate notification bell in the shell.

## Current Shell

| Layer | Status | Production role |
|---|---|---|
| Sidebar | KEEP | Stable workflow navigation |
| Header Search | KEEP | Deep command and entity access |
| Operations drawer | KEEP | Contextual workflow action area |
| Middle utility rail | REMOVE | Removed to avoid multi-rail clutter |
| Notification bell | MERGE | Removed; future notifications belong in drawer once service-backed |
| Floating quick launcher | MERGE | Removed; command search and drawer cover this use case |

## Sidebar Structure

| Section | Routes | Rationale |
|---|---|---|
| Focus | Live Workspace, Dashboard, Analytics | Execution, executive summary, review |
| Work | Task Board, Client Master, Document Vault | Daily operating work |
| Compliance | GST Intelligence, Compliance, Notice Center | Domain risk and deadlines |
| Control | Approvals, Governance | Trust, approvals, auditability |
| Administration | Billing, Staff, Audit, Security, QA | Role-scoped admin and readiness work |

## Moved Out Of Primary Navigation

| Feature | Destination |
|---|---|
| AI Copilot | Search and future contextual drawer entry after workflow data wiring |
| Command Center | Search/shortcut; redundant as persistent sidebar item |
| Team Coordination | Search/contextual action from task and collaboration workflows |
| Automation | Admin/search; not first-line daily navigation |
| Autonomous Ops | Admin/search; not first deployment primary nav |
| Integrations | Admin/search; production readiness/admin workflow |
| Learning | Search/contextual resolution support |

## Next Hardening Steps

1. Wire Operations drawer to live task, notice, approval, GST, and notification data.
2. Add route-level action outcomes for command-dispatched workflows.
3. Remove or downgrade dashboard widgets that do not lead to a workflow.
4. Add interaction tests for search, sidebar routes, drawer actions, and onboarding resume.
