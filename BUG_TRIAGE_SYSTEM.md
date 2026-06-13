# Bug Triage System

Date: 2026-06-04

Purpose: classify, route, fix, and verify issues found during pilot execution.

## Severity Levels

| Severity | Name | Definition | SLA |
|---|---|---|---|
| P0 | Critical | Blocks pilot operations, causes data loss, tenant leakage, security failure, broken login, or unusable core workflow | Same day |
| P1 | High | Blocks scale or customer trust; workaround exists but is operationally risky | 2 business days |
| P2 | Medium | Workflow friction, confusing UI, missing feedback, non-critical reliability issue | 5 business days |
| P3 | Low | Polish, copy, layout, minor efficiency improvement | Backlog |

## Triage Workflow

| Step | Action | Owner |
|---|---|---|
| 1 | Log issue with reproduction, role, module, tenant, and expected/actual result | Reporter |
| 2 | Assign severity using definitions above | Pilot lead |
| 3 | Confirm reproduction or mark needs evidence | Engineering/QA |
| 4 | Assign owner and target fix date | Pilot lead |
| 5 | Fix issue or document accepted workaround | Engineering/Product |
| 6 | Verify after refresh and logout/login where relevant | QA/Pilot user |
| 7 | Close with evidence and customer impact note | Pilot lead |

## Required Bug Fields

| Field | Required |
|---|---|
| Bug ID | Yes |
| Date found | Yes |
| Reporter | Yes |
| User role | Yes |
| Module | Yes |
| Tenant/Firm | Yes if data-related |
| Reproduction steps | Yes |
| Expected result | Yes |
| Actual result | Yes |
| Severity | Yes |
| Workaround | Yes/No |
| Owner | Yes |
| Verification evidence | Required before close |

## Severity Examples

| Example | Severity |
|---|---|
| User cannot log in | P0 |
| Staff sees another firm's client | P0 |
| Task completion does not persist | P0 |
| Compliance item cannot be created or updated | P0 |
| GST analysis claims raw upload certification incorrectly | P0 |
| Notification opens the wrong record | P1 |
| User needs admin help for a normal workflow | P1 |
| Loading state missing on save | P2 |
| Button label is unclear | P2 |
| Minor spacing issue | P3 |

## Daily Triage Board

| ID | Severity | Module | Issue | Owner | Status | Target |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

## Closure Rules

A bug is not closed until:

1. The original reproduction no longer fails.
2. The affected role verifies the fix.
3. Persistence is checked after refresh when data is involved.
4. Logout/login is checked when session or auth is involved.
5. Tenant isolation is checked when firm/client data is involved.
6. The pilot lead records whether the issue affected launch readiness.
