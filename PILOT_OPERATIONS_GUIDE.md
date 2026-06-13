# Pilot Operations Guide

Date: 2026-06-04

Purpose: run CAATH as a real internal operating platform before onboarding the first external pilot customer.

## Pilot Operating Principle

Use CAATH for daily work, not demonstrations. Every workflow should produce one of three outcomes:

| Outcome | Meaning |
|---|---|
| Completed | The user finished real work inside CAATH without external workaround |
| Completed with workaround | The user finished work, but needed manual tracking, hidden setup, or a fallback tool |
| Blocked | The user could not finish the workflow in CAATH |

## Daily Usage Workflow

| Step | Owner | Expected Action | Evidence to Capture |
|---|---|---|---|
| Start day | Manager | Open dashboard and review priority tasks, compliance deadlines, notifications, and escalations | Screenshot or note of top 5 priorities |
| Assign work | Manager | Assign or rebalance tasks for staff | Task IDs, assignee, due date |
| Execute work | Staff | Update task status, add notes, upload documents, resolve comments | Task activity trail |
| Review exceptions | Manager | Review overdue tasks, compliance risk, GST findings, and missing documents | Exception list and decisions |
| Close day | Admin/Manager | Confirm completed tasks, unresolved blockers, and next-day priorities | End-of-day summary |

## Task Management Workflow

| Step | Expected Behavior | Pilot Acceptance |
|---|---|---|
| Create task | User can create task with title, client, assignee, due date, priority, and status | Task appears without refresh and persists after refresh |
| Assign task | Manager can assign task to staff | Assignee sees task in their view |
| Update task | Staff can move task through lifecycle | Status, timestamp, and activity update |
| Complete task | Task can be marked complete with evidence or note | Completed task remains auditable |
| Escalate task | Overdue or blocked work can be escalated | Notification or visible escalation is created |

## Client Workflow

| Step | Expected Behavior | Pilot Acceptance |
|---|---|---|
| Add client | Admin/Manager creates client with required profile data | Client appears in client master |
| Edit client | User updates contact, tax, or operational details | Changes persist after refresh |
| View client work | User sees tasks, compliance, documents, and GST context for the client | No duplicate or conflicting client views |
| Archive/inactivate | User can remove inactive clients from active workflow | Active worklists become cleaner |

## Compliance Workflow

| Step | Expected Behavior | Pilot Acceptance |
|---|---|---|
| Create compliance item | User creates statutory obligation with client, due date, owner, period, and status | Item persists and appears in compliance tracker |
| Monitor due items | Manager can see due and overdue obligations | Due list matches source records |
| Update status | Staff can update pending, in progress, filed, reviewed, or overdue states | Status transition is visible |
| Resolve exception | Overdue or blocked compliance item can be assigned and closed | Resolution is auditable |

## GST Workflow

| Step | Expected Behavior | Pilot Acceptance |
|---|---|---|
| Select client and period | User chooses GST client context | Analysis uses correct client and period |
| Load GST data | Pilot uses preloaded persisted GST operational tables | Data readiness is visible |
| Upload supporting files | User may upload files for lineage/evidence only | User is not told raw upload is certified ingestion |
| Run analysis | System identifies GSTR-1 vs 3B variance and ITC reconciliation issues from persisted data | Findings include evidence source |
| Resolve findings | User records decision, task, or follow-up | Resolution path is visible and trackable |

GST constraint: raw GST file upload is not certified as durable ingestion. During pilot, GST analysis must use persisted operational GST records.

## Document Workflow

| Step | Expected Behavior | Pilot Acceptance |
|---|---|---|
| Upload document | User uploads document to a client or task context | File is retrievable after refresh |
| Categorize document | User assigns document type and context | Document appears in correct client/task view |
| Review document | Manager or staff can inspect document metadata and status | Review outcome is visible |
| Use document in workflow | Document supports task, compliance, GST, or client action | User does not need external file tracking |

## Daily Pilot Ceremony

| Time | Activity | Output |
|---|---|---|
| Morning | Review dashboard, tasks, compliance deadlines, GST exceptions | Daily priority list |
| Midday | Check stalled workflows and navigation friction | Observation log entries |
| End of day | Review completed work, blockers, bug reports, and support needs | Pilot operations summary |

## Pilot Success Criteria

| Area | Minimum Target |
|---|---|
| Task completion | 90% of assigned pilot tasks completed or moved forward inside CAATH |
| Client workflow | 20 pilot clients created or validated without data loss |
| Compliance workflow | All pilot compliance items visible with owner, status, and due date |
| GST workflow | At least one client-period analyzed using persisted GST records |
| Document workflow | Uploaded documents retrievable after refresh and tied to client/task context |
| User feedback | Every confusion point logged within 24 hours |

## Stop Conditions

Stop pilot usage and classify as P0 if:

1. Users cannot log in or stay authenticated.
2. Client, task, compliance, or document records disappear after refresh.
3. Users can see another firm tenant's data.
4. GST analysis presents simulated output as real evidence.
5. Core task or compliance lifecycle cannot complete.
