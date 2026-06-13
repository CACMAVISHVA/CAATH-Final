# CAATH First-Run Experience Guide

Date: 2026-06-04  
Audience: New firm SuperAdmin/Admin.

## Goal

A new user should understand CAATH, configure the workspace, add a first client, create a first task, and upload a first GST dataset in one guided session.

## First Session Path

### Step 1. Sign In

Expected:

- User signs in with invited email.
- User lands in Live Workspace.
- Header shows protected firm workspace identity.

Success:

- User can identify the active firm and role.

### Step 2. Understand Navigation

Explain:

- Focus: Workspace, Dashboard, Analytics.
- Work: Tasks, Clients, Documents.
- Compliance: GST, Compliance, Notices.
- Control: Approvals, Governance.
- Search: jump to records and actions.
- Operations: action-backed workflow shortcuts.

Success:

- User can open Search and Operations drawer.

### Step 3. Configure Initial Settings

Configure:

- Firm profile.
- Staff roles.
- GST periods.
- Client service defaults.
- Document categories.
- Approval owners.

Success:

- SuperAdmin confirms the workspace is ready for the first client.

### Step 4. Add First Client

Required fields:

- Client name.
- Client type.
- PAN.
- GSTIN if GST workflow is enabled.
- Contact person.
- Email/phone.
- Services.
- Assigned staff.

Success:

- Client appears in Client Master.
- Audit log records creation.
- Client can be selected in task/GST workflows.

### Step 5. Create First Task

Create:

- Title.
- Description.
- Client.
- Assignee.
- Priority.
- Deadline.
- Category.

Success:

- Task appears in Task Board.
- Assigned user can see it.
- Status can move through lifecycle.

### Step 6. Upload First GST Dataset

Upload or prepare:

- GSTR1.
- GSTR3B.
- GSTR2B.
- Purchase register.

Success:

- Dataset is recognized.
- GST Intelligence can run against the selected client/GSTIN/period.
- No random or dummy record counts are shown as live metrics.

### Step 7. Create First Support Ticket

Use support flow for:

- workflow issue
- feedback
- error report
- governance escalation

Success:

- Ticket appears in support timeline through `enterprise_activities`.
- Escalation state is available when required.

## First-Run Completion Criteria

The firm is first-run complete when:

- At least one client exists.
- At least one staff member is assigned work.
- At least one task has moved status.
- At least one GST dataset path is validated.
- At least one support ticket path is validated.
