# Pilot Execution Plan

Date: 2026-06-04

Purpose: execute CAATH as a real operating platform before first external pilot and first paying customer deployment.

## Pilot Duration

| Phase | Duration | Goal |
|---|---:|---|
| Internal readiness run | 5 business days | Prove daily operating workflows with internal team |
| Controlled pilot customer | 10 business days | Validate real CA firm usage with support oversight |
| Paid customer readiness window | 30 calendar days | Prove reliability, support, and repeatability |

## Pilot Users

| Role | Count | Pilot Responsibility |
|---|---:|---|
| Super Admin / Firm Owner | 1 | Firm setup, user control, executive review |
| Admin | 1 | Client setup, compliance setup, operational configuration |
| Manager | 1 | Task assignment, review, escalations, daily control |
| Staff | 2 | Task execution, document upload, compliance updates |
| Client user | 1 optional | Portal/document collaboration validation |

Minimum internal pilot group: **5 active users**.

## Daily Workflows

| Workflow | Daily Pilot Action | Evidence |
|---|---|---|
| Login/logout | Each pilot user logs in and out once daily | Session behavior noted |
| Dashboard review | Manager reviews priorities, deadlines, and exceptions | Daily priority list |
| Client workflow | Add, edit, or validate client records | Client changes persist after refresh |
| Task workflow | Create, assign, update, complete, and review tasks | Task lifecycle trail |
| Compliance workflow | Update due, overdue, filed, and review states | Compliance status evidence |
| GST workflow | Run controlled persisted-data GST analysis | Findings with evidence source |
| Document workflow | Upload and retrieve documents | File retrieval after refresh |
| Notifications | Follow alerts back to actionable records | Notification click-through result |
| Support loop | Log every bug, friction point, and confusion point | Bug and observation entries |

## Success Criteria

| Area | Success Target |
|---|---|
| Authentication | 100% pilot users can log in, log out, and resume work |
| Client management | 20 clients created or validated without data loss |
| Task management | 50 tasks created, 35 completed or meaningfully advanced |
| Compliance | 20 compliance items tracked with owner, due date, and status |
| GST | 2 client-period analyses completed using persisted GST data |
| Documents | 25 documents uploaded and retrieved after refresh |
| Observations | All friction points logged within 24 hours |
| Bugs | Zero open P0 at pilot exit |
| Adoption | At least 4 of 5 internal users use CAATH daily |

## Failure Criteria

| Failure | Severity |
|---|---|
| Login is unavailable for any pilot role | P0 |
| Tenant data leakage is observed or suspected | P0 |
| Client, task, compliance, GST, or document data disappears after refresh | P0 |
| Core task lifecycle cannot complete | P0 |
| Compliance lifecycle cannot complete | P0 |
| GST output is presented as raw-upload certified when it is only persisted-data certified | P0 |
| Users need hidden technical knowledge to complete common workflows | P1 |
| Navigation repeatedly sends users to duplicate or dead paths | P1 |
| Support cannot respond to pilot issues within one business day | P1 |

## Pilot Cadence

| Time | Activity | Owner |
|---|---|---|
| Start of day | Review priorities, assignments, deadlines, and known blockers | Manager |
| Midday | Check stalled tasks and support issues | Manager/Admin |
| End of day | Record completed work, bugs, observations, and unresolved risks | Pilot lead |
| Weekly | Decide keep/merge/remove workflow and navigation changes | Product/Engineering |

## Exit Decision

| Decision | Criteria |
|---|---|
| Continue internal pilot | P0 exists or usage evidence is insufficient |
| Move to first pilot customer | Zero P0, contained P1 list, workflows proven by internal users |
| Move to first paying customer | 30-day reliability evidence, repeatable onboarding, support readiness |
