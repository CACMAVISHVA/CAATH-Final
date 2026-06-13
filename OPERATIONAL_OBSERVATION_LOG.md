# Operational Observation Log

Date opened: 2026-06-04

Purpose: capture real pilot usage observations before they become design debt, support load, or customer churn.

## How to Use This Log

Every observation should be recorded within the same working day. Do not wait until a bug is fully understood. The first duty is to preserve what the user experienced.

| Field | Required Value |
|---|---|
| Observation ID | `OBS-YYYYMMDD-###` |
| Reporter | User or observer name |
| Role | God Admin, Super Admin, Admin, Manager, Staff, Client |
| Module | Dashboard, Client, Task, Compliance, GST, Documents, Notifications, AI Copilot, Analytics, Governance |
| Type | Confusion, friction, slow workflow, duplicate action, missing feature, unexpected behavior |
| Severity | P0, P1, P2 |
| Status | Open, investigating, accepted, fixed, closed |

## Observation Registry

| ID | Date | Reporter | Role | Module | Type | Observation | Impact | Severity | Status | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| OBS-20260604-001 | 2026-06-04 | Internal pilot | Manager | GST | Unexpected behavior | Raw GST upload records lineage but is not certified as durable ingestion | User may expect upload-to-analysis | P1 | Open | Product |
| OBS-20260604-002 | 2026-06-04 | Internal pilot | Admin | Navigation | Navigation friction | Multiple historical documents indicate prior navigation density concerns | Users may hesitate between dashboard, workspace, and module paths | P1 | Open | Product |
| OBS-20260604-003 | 2026-06-04 | Internal pilot | Staff | Compliance | Missing evidence | Compliance workflow needs proof that every status transition persists | Trust risk during pilot | P1 | Open | Engineering |
| OBS-20260604-004 | 2026-06-04 | Internal pilot | Manager | Notifications | Duplicate action | Notifications, alerts, escalations, and activity signals must stay consolidated | Alert fatigue risk | P2 | Open | Product |

## Confusion Tracker

| Question User Asked | Module | Root Cause Hypothesis | Follow-Up |
|---|---|---|---|
|  |  |  |  |

## Navigation Friction Tracker

| From | To | Expected Path | Actual Path Used | Friction |
|---|---|---|---|---|
|  |  |  |  |  |

## Slow Workflow Tracker

| Workflow | Expected Time | Actual Time | Delay Cause | Fix Candidate |
|---|---:|---:|---|---|
|  |  |  |  |  |

## Duplicate Action Tracker

| Action | Duplicate Location | Preferred Location | Decision |
|---|---|---|---|
|  |  |  |  |

## Missing Feature Tracker

| Requested Capability | Module | Workaround Used | Severity | Decision |
|---|---|---|---|---|
|  |  |  |  |  |

## Unexpected Behavior Tracker

| Behavior | Expected | Actual | Reproduction Steps | Severity |
|---|---|---|---|---|
|  |  |  |  |  |

## Weekly Observation Review

| Metric | Target |
|---|---|
| P0 observations | 0 open |
| P1 observations older than 7 days | 0 open without owner |
| Repeated confusion items | Converted into UX fix or user guidance |
| Duplicate actions | Consolidated or explicitly justified |
