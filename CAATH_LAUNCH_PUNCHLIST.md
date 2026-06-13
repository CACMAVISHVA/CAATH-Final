# CAATH Launch Punchlist

Date: 2026-06-04

## P0

| Item | Acceptance criteria |
|---|---|
| Complete staging firm onboarding dry run | Firm, users, roles, client, task, GST dataset, support ticket all validated |
| Validate tenant isolation/RLS | Cross-tenant access tests pass |
| Validate Client Portal visibility | Client sees only approved own data |
| Resolve Manager role | Explicitly mapped to Admin or removed from sales/onboarding language |
| Validate support ticket lifecycle | Create, reply, status update, escalation, timeline visible |
| Validate billing activation state | Subscription status controls access as expected |
| Validate first GST workflow | Upload/parse lineage/reconciliation does not show dummy metrics |

## P1

| Item | Acceptance criteria |
|---|---|
| Support dashboard/reporting | Customer success can review open tickets by firm/severity |
| Onboarding analytics | Track first client/task/GST completion |
| Plan enforcement | Feature gates align to Pilot/Professional/Enterprise |
| Compliance persistence expansion | Non-GST compliance domains are not just task-derived |
| Error reporting UI | ErrorBoundary can route authenticated errors into support ticket workflow |
| Pilot training materials | Short role-based onboarding docs and videos |

## P2

| Item |
|---|
| Self-serve firm signup |
| Automated billing provider integration |
| Advanced usage metering |
| AI Copilot commercial packaging |
| Reintroduce utility rail if validated by user telemetry |
| Public launch content |

## Launch Recommendation

Proceed to one controlled pilot after P0 completion. Do not proceed to broad paid launch until P1 support and billing operations are proven.
