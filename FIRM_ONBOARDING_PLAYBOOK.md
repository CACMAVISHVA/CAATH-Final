# CAATH Firm Onboarding Playbook

Date: 2026-06-04  
Audience: CAATH implementation lead, customer success, GodAdmin, first firm SuperAdmin.

## Objective

Provision a new CA firm into CAATH with a working tenant, users, roles, starter configuration, and first workflow path.

## Onboarding Flow

### 1. Pre-Onboarding Intake

Collect:

- Firm legal name and display name.
- Primary owner/SuperAdmin name, email, phone.
- Expected users by role: SuperAdmin, Admin, Staff, Client.
- Services enabled for pilot: GST, Compliance, Notices, Documents, Tasks, Approvals.
- Pilot client list size.
- GST dataset readiness: GSTR1, GSTR3B, GSTR2B, purchase register.
- Billing plan and pilot commercial terms.

Exit criteria:

- Pilot scope signed off.
- Role map approved.
- Data owner identified.
- Support escalation owner identified.

### 2. Firm Creation

GodAdmin creates the firm record with:

- Firm name.
- Owner email.
- Status: Active.
- Subscription plan: Pilot or Enterprise trial.
- Start and review dates.

Validation:

- Firm appears in GodAdmin firm operations.
- Firm has unique tenant ID.
- Firm is isolated from other tenant data.

### 3. Workspace Provisioning

Provision:

- Firm workspace identity.
- Default role access.
- Default dashboard/workspace preferences.
- GST and compliance modules enabled for pilot scope.
- Document visibility rules.
- Approval workflow defaults.

Validation:

- SuperAdmin lands in `workspace`.
- Sidebar shows only firm-appropriate navigation.
- Search and Operations drawer work.

### 4. User Invitation

Invite:

- 1 SuperAdmin.
- 1 Admin.
- 2-5 Staff.
- 1-3 Client portal users for controlled testing.

Validation:

- Each user can sign in.
- Each user lands on correct home route.
- Staff only sees permitted firm data.
- Client only sees client portal data.

### 5. Role Assignment

Current supported roles:

- GodAdmin
- SuperAdmin
- Admin
- Staff
- Client

Manager is not currently implemented. For pilot, map Manager to Admin or exclude the role from scope.

Validation:

- Role permissions match [ROLE_VALIDATION_MATRIX.md](ROLE_VALIDATION_MATRIX.md).
- Cross-tenant access is blocked.
- Client portal access is scoped.

### 6. Initial Configuration

Configure:

- Firm profile.
- Staff assignment defaults.
- GST filing periods.
- Client services.
- Document categories.
- Notice response ownership.
- Approval chain owners.
- Support owner and escalation policy.

### 7. Pilot Activation

Activation is complete when:

- First client is created.
- First task is created and assigned.
- First GST dataset upload path is demonstrated.
- First document is visible in vault.
- First support ticket is created.
- First client portal user signs in.

## Onboarding Risks

| Risk | Classification | Mitigation |
|---|---|---|
| Manager role requested | P0 | Map to Admin or defer |
| Tenant isolation not tested | P0 | Run cross-firm access tests before go-live |
| Dashboard metrics not fully sourced | P1 | Use workflow screens as source of truth during pilot |
| Support SLA undefined | P1 | Agree support hours and escalation contacts before pilot |
