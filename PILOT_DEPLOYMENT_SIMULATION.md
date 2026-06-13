# CAATH Pilot Deployment Simulation

Generated: 2026-06-04

## Simulation Model

Scenario:

- One CA firm.
- Five users.
- Twenty clients.
- Fifty tasks.
- GST workflows for selected clients.

This is a code-and-workflow simulation based on current UI and service behavior, not a live seeded database execution.

## Pilot Tenant Setup

| Entity | Target | Required Setup | Readiness |
|---|---:|---|---|
| Firm | 1 | Firm row with active subscription/features. | Partial |
| Users | 5 | Supabase Auth users plus `public.users` profiles. | Partial |
| Roles | SuperAdmin, Admin, 2 Staff, Client | Role mapping in `public.users`; Staff assigned to firm. | Partial |
| Clients | 20 | Created through Client Master or seed/import. | Ready |
| Tasks | 50 | Created through Task Board; assigned to Staff/Admin. | Ready |
| Compliance records | 20-60 | Need persisted compliance source replacing sample records. | Blocked |
| Documents | 20+ | Supabase storage bucket/RLS and client context upload. | Partial |
| GST datasets | 3-5 per GST workflow | Real files and parser/persistence validation. | Partial |
| Notifications | Operational alerts | Real notification records/actions needed. | Blocked |

## Simulated Execution

### 1. Firm And User Provisioning

Expected flow:

1. Create firm.
2. Create Supabase Auth users.
3. Create `public.users` profiles with roles and firm_id.
4. Validate login for each user.

Likely failures:

- User can authenticate but lacks matching profile or active status.
- Staff cannot see intended work if assignment/user rows are incomplete.
- Client user portal requires client-contact linkage.

Severity: P0.

### 2. Twenty-Client Onboarding

Expected flow:

1. SuperAdmin/Admin opens Client Master.
2. Creates 20 clients with valid PAN and optional GSTIN.
3. Edits at least five records.
4. Searches and filters by client name/PAN.

Likely failures:

- Duplicate PAN correctly blocks creation.
- Incorrect GSTIN blocks creation.
- Filter button appears but does not expose a dedicated filter panel; search works.

Severity: P1 for filter affordance, otherwise Ready.

### 3. Fifty-Task Workload

Expected flow:

1. Create 50 tasks across 20 clients.
2. Assign to two Staff users.
3. Bulk reassign some tasks with reason.
4. Move tasks through lifecycle to Completed.
5. Confirm Staff sees only assigned tasks.

Likely failures:

- Invalid workflow transitions may fail silently in some UI paths because status update errors are logged but not consistently surfaced.
- Role delegation restrictions may surprise Admin/Staff if not explained.
- AI queue may show advisory prioritization, but not all guidance becomes durable work.

Severity: P1.

### 4. Compliance Lifecycle

Expected flow:

1. Generate compliance obligations per client.
2. Assign owner.
3. Move through Pending, Awaiting Documents, Under Review, Filed/Closed.
4. Export real compliance report.

Actual current state:

- Compliance Tracker renders `SAMPLE_COMPLIANCES`.
- Row action menu is visible but not a real lifecycle editor.
- Export works against current in-memory/sample records.

Failure:

- Cannot validate real compliance lifecycle for pilot.

Severity: P0.

### 5. GST Workflows

Expected flow:

1. Select client, FY, filing mode, period, preset.
2. Upload required datasets.
3. Validate/normalize.
4. Execute GST Intelligence.
5. Review risk, reconciliation, resolution center, and workflow actions.

Likely failures:

- Operator must know which dataset files satisfy each requirement.
- Upload session records filenames/status but persistence/parsing should be proven with real files.
- Generated workflow actions appear advisory unless tied to task/notice creation.

Severity: P0 until real-file persistence and execution are browser-tested.

### 6. Documents

Expected flow:

1. Upload client documents.
2. Preview PDF/image.
3. Download/archive/restore.
4. Link document to task/notice.

Likely failures:

- Upload button is only available with `clientId`; global vault is list-only.
- Preview depends on reachable `file_path`.
- Download/archive/restore buttons are visible but not wired in the detail footer.

Severity: P1.

### 7. Notifications And AI

Expected notification flow:

- Trigger task/compliance/GST events.
- Create notifications.
- User views, acknowledges, routes/escalates.

Actual current state:

- Notification Engine displays static metrics/cards.

Expected AI flow:

- Recommendations can be opened, applied, dismissed, and undone.
- Executive brief routes to Analytics.

Actual current state:

- AI Copilot is operationally navigational/advisory, but not a durable work-item creator.

Severity:

- Notifications: P0.
- AI Copilot: P1.

## Pilot Simulation Verdict

Pilot readiness: Partial.

CAATH can support a controlled UAT of authentication, client CRUD, task lifecycle, and selected document/GST workflows. It is not ready for an unassisted first pilot until Compliance Tracker and Notifications are made real or removed from pilot scope.

## Pilot Blockers

| Priority | Blocker |
|---|---|
| P0 | Compliance Tracker uses sample data and lacks real create/update/file lifecycle. |
| P0 | Notification Engine is static and does not support real acknowledge/route workflows. |
| P0 | GST upload/execution must be proven with real persisted datasets. |
| P0 | Firm/user provisioning remains hidden setup, not a guided admin flow. |
| P1 | Document Vault detail actions need wired download/archive/restore handlers. |
| P1 | Task status transition errors need visible feedback. |
| P1 | AI Copilot actions need clearer durable outcome labeling. |

