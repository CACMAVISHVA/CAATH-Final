# CAATH First User Experience Audit

Generated: 2026-06-04

## Scenario

Persona: new Staff member joining a CA firm.

Assumption: the firm, user profile, role, and Supabase Auth account have already been provisioned by an administrator.

## Can The Staff Member Complete Core First-Day Actions?

| First-Day Action | Can Complete Without Training? | Evidence | Friction |
|---|---:|---|---|
| Log in | Yes, if account already exists | Email/password login screen and Supabase session flow. | Needs valid Supabase account and profile. |
| Understand navigation | Partially | Sidebar, top Search, Operations drawer, onboarding modal. | Many enterprise labels require product familiarity. |
| Add a client | Mostly | Client Master has clear Add New Client modal and validation. | Staff role can access clients; firm must exist; PAN/GSTIN knowledge required. |
| Create a task | Mostly | Task Board has New Task modal, client selector, assignee selector, deadline. | Assignee list depends on provisioned firm users. |
| Upload GST data | No, not confidently | GST Intelligence has dataset labels and file inputs. | Requires GST domain knowledge; upload persistence/parsing is not obvious. |
| Find assigned work | Yes | Staff sees Task Board via `getMyTasks`. | Task list depends on assignment data. |
| Complete work | Yes | Status dropdown supports Completed; workflow transitions are guarded. | Invalid transitions may fail without visible guidance. |
| Upload client documents | Partially | Document Vault upload works in client context. | Global vault hides Upload; user must enter client profile/context. |

## Navigation Comprehension

| Area | First-Time Clarity | Notes |
|---|---|---|
| Dashboard | Medium | Gives overview but may still feel dashboard-heavy. |
| Client Master | High | Clear CRUD surface. |
| Tasks & Workflows | High | Board/list metaphor is familiar. |
| Compliance Tracker | Low for production | Sample records make first-time trust risky. |
| GST Intelligence | Medium for GST expert, low for new staff | Strong domain workflow but dense. |
| AI Copilot | Medium | Recommendations are visible, but durable outcome is not always clear. |
| Document Vault | Medium | Listing is clear; upload discoverability depends on context. |
| Operations Drawer/Search | Medium | Fast for trained operators, less obvious for new staff. |

## First User Journey Verdict

CAATH is usable for a first staff member only if onboarding is assisted for the first session.

Without training, a staff member can likely:

- Log in.
- Open Tasks.
- Find assigned tasks.
- Create a basic task.
- Add a basic client if they understand PAN/GSTIN.

Without training, a staff member will likely struggle to:

- Understand whether Compliance Tracker data is real.
- Know where to upload documents if starting from the global vault.
- Know which GST datasets are required and whether upload truly persisted.
- Understand which AI actions are advisory versus operationally durable.

## First-Time Staff UAT Script

| Step | Test | Expected Outcome | Status |
|---|---|---|---|
| 1 | Staff receives email/password and logs in. | Staff lands in allowed workspace. | Ready |
| 2 | Staff opens Client Master. | Client list loads for firm or empty state explains next step. | Ready |
| 3 | Staff adds test client with valid PAN/GSTIN. | Client persists and appears in table. | Ready |
| 4 | Staff opens Task Board and creates task for new client. | Task appears in board/list. | Ready |
| 5 | Staff assigns task to self or allowed assignee. | Assignment persists. | Ready |
| 6 | Staff completes task. | Status changes to Completed and persists after reload. | Ready |
| 7 | Staff opens Compliance Tracker. | Should show real firm compliance records. | Blocked until sample data removed. |
| 8 | Staff opens GST Intelligence and uploads dataset. | Required datasets show uploaded and engine can run. | Partial |
| 9 | Staff uploads document for client. | File appears in client document list and can preview/download. | Partial |

## Training Need

Minimum pilot training required: 60-90 minutes.

Training should cover:

- Role permissions.
- Client creation standards.
- Task lifecycle and status transitions.
- Document upload from client context.
- GST dataset requirements.
- What AI Copilot can and cannot execute.

