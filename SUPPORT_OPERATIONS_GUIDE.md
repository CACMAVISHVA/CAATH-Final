# Support Operations Guide

Date: 2026-06-04

## Implemented Support Paths

Existing support infrastructure is based on:

- `ticketService`
- `supportEscalationTicketingService`
- `enterprise_activities`
- enterprise event publishing

Added pilot-facing service helpers:

- `collectPilotFeedback`
- `reportPilotError`
- `escalateSupportIssue`

These reuse the existing ticket domain and do not introduce a new architecture layer.

## Support Ticket Categories

| Category | Use |
|---|---|
| technical_issue | Broken workflow, runtime error, failed action |
| workflow_issue | User cannot complete a business process |
| billing_issue | Subscription or invoice concern |
| compliance_issue | Filing, notice, GST, compliance problem |
| operational_request | Customer success request |
| feature_request | Pilot feedback and product requests |
| governance_escalation | Permission, audit, approval, trust issue |

## Priority Model

| Priority | SLA target | Examples |
|---|---|---|
| critical | Same business day | Data access issue, tenant leak, GST workflow blocked |
| high | 1 business day | Task lifecycle broken, client CRUD issue, login issue |
| medium | 2 business days | Confusing workflow, missing state feedback |
| low | Weekly review | Enhancement, feedback, usability suggestion |

## Error Reporting

Use `reportPilotError` with:

- workflow area
- error message
- reproduction steps
- user role
- firm context

Errors are created as high-priority technical tickets with escalation state.

## Feedback Collection

Use `collectPilotFeedback` for:

- first-run friction
- missing workflow affordances
- confusing copy
- dashboard usefulness
- training needs

Feedback is created as low-priority feature-request support tickets.

## Issue Escalation

Use `escalateSupportIssue` when:

- customer cannot complete work
- issue has data/security risk
- issue affects multiple users
- issue requires governance review

Escalations update ticket state and add an auditable reply.

## Pilot Support Cadence

| Cadence | Action |
|---|---|
| Daily | Review critical/high tickets |
| Twice weekly | Review workflow friction and feedback |
| Weekly | Review support metrics and launch punch list |
| End of pilot | Decide ready, extend pilot, or block commercialization |
