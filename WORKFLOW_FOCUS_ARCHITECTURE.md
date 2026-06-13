# CAATH Workflow Focus Architecture

Date: 2026-06-04

## Product Principle

CAATH should route the user toward the next valuable action, not toward the maximum number of available modules.

## Focus Architecture

```text
Sidebar -> choose operating area
Header Search -> jump to action or record
Operations Drawer -> resolve signal or interruption
Workspace -> execute workflow
```

## Primary Workflows

| Workflow | Primary surface | Supporting surface | Measurement |
|---|---|---|---|
| Daily execution | Live Workspace | Task Board | Work completed, SLA risk reduced |
| Client operations | Client Master | Search | Client record update, assignment, follow-up |
| Compliance resolution | GST, Compliance, Notices | Operations drawer | Variance resolved, notice response completed |
| Evidence management | Document Vault | Operations drawer | Missing document closed, version governed |
| Approval unblock | Approvals, Governance | Operations drawer | Approval completed, audit trace available |
| Executive review | Dashboard, Analytics | Operations drawer | Risks understood, decisions made |

## Contextual Operations Drawer

The drawer consolidates:

- alerts
- notifications
- AI recommendations
- collaboration handoffs
- activity and timeline events

Each drawer item must include:

- type
- priority
- owner
- due state
- concise reason
- one action
- loading/success/error feedback

## Navigation Promotion Rule

A feature earns persistent sidebar placement only if it satisfies at least two:

- used daily or weekly by target users
- directly executes a revenue/compliance/client workflow
- resolves risk or unblock approvals
- materially improves executive decision speed
- has complete loading, success, and error behavior

Everything else moves to command search, contextual drawer, or admin settings.

## Badge Reduction Rule

Use one aggregate signal count at the shell level. Detailed counts belong inside the drawer, grouped by severity and type. Avoid badge-per-icon patterns unless the user is already inside the relevant workflow.
