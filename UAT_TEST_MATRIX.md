# CAATH Real UAT Test Matrix

Generated: 2026-06-04

## UAT Scope

This matrix treats CAATH as a pilot product for one real CA firm. It does not assume new architecture, new intelligence layers, or demo-only operator knowledge.

## Test Status Legend

| Status | Meaning |
|---|---|
| Ready | Workflow has visible UI, persistence path, validation/error handling sufficient for pilot UAT. |
| Partial | Workflow is usable but needs setup, validation, or missing action wiring before pilot confidence. |
| Blocked | Workflow is sample/inert or cannot complete end-to-end as a real firm workflow. |

## Core UAT Matrix

| Workflow | Primary Role | Entry Point | UAT Steps | Expected Result | Evidence | Status | Priority |
|---|---|---|---|---|---|---|---|
| Login | All active users | Login screen | Open app, enter Supabase email/password, submit. | Session restores, profile resolves, role home opens. | `AuthContext`, `authService`, `SupabaseAuthRepository`, `App.tsx` gate. | Ready | P0 |
| Logout | All active users | Sidebar logout | Click logout, reload same origin. | Supabase sign-out completes, app returns to login. | `App.handleLogout`, `authService.logout`, `supabase.auth.signOut`. | Ready | P0 |
| User creation | SuperAdmin/Admin for staff/client; unauthenticated Client only | Login Create Account, Staff Management | Create account and verify profile. | Client self-signup works only for Client; internal user creation requires governed path. | `accountOnboardingService` restricts unauthenticated role creation to Client. | Partial | P0 |
| Role assignment | SuperAdmin/Admin | Account onboarding / staff governance | Assign Admin/Staff/Client and verify route access. | Role is reflected in `public.users`, sidebar, route gates. | `ROLE_ACCESS`, `ProtectedRoute`, `accountOnboardingService`. | Partial | P0 |
| Client creation | SuperAdmin/Admin/Staff | Client Master > Add New Client | Add name, type, PAN, optional GSTIN, services. | Client persists to Supabase, audit log written, list refreshes. | `ClientMaster`, `clientDomainService.createClient`. | Ready | P0 |
| Client editing | SuperAdmin/Admin/Staff | Client Master row action | Edit name/email/phone/services. | Updates persist and audit log written. | `ClientMaster.handleUpdateClient`, `clientDomainService.updateClient`. | Ready | P0 |
| Client deletion | Permissioned roles | Client Master row delete | Delete allowed client. | Record deleted in firm scope, audit log written. | `canDeleteClient`, `clientDomainService.deleteClient`. | Partial | P1 |
| Task creation | SuperAdmin/Admin/Staff | Task Board > New Task | Add title, category, client, assignee, deadline. | Task persists, audit/event log written, board refreshes. | `TaskBoard`, `taskDomainService.createTask`. | Ready | P0 |
| Task assignment | SuperAdmin/Admin | Task creation or bulk reassignment | Assign Staff, reassign selected tasks with reason. | Assignee is same firm; role rules enforced; history/audit written. | `RoleBasedAssignment`, `bulkReassignTasks`, `reassignTask`. | Ready | P0 |
| Task completion | Assigned staff/Admin | Task Board status select | Move task to Completed. | Valid transition persists, completion event emitted, revenue chain registered. | `updateTaskStatus`, workflow transition guard. | Ready | P0 |
| Task detail update | SuperAdmin/Admin/Staff | Task Detail Drawer | Update task fields/activity. | Must persist and refresh board. | `TaskDetailDrawer` present; service supports `updateTask`. | Partial | P1 |
| Compliance lifecycle | Staff/Admin | Compliance Tracker | Create/update/advance filing status. | Real compliance records should persist and progress from pending to filed/closed. | UI uses `SAMPLE_COMPLIANCES`; no create/update lifecycle path visible in component. | Blocked | P0 |
| Compliance export | Staff/Admin | Compliance Tracker > Export Report | Export filtered compliance list. | Export file generated from current records. | `ExportModal`, `exportData`. | Partial | P1 |
| GST Intelligence context load | Staff/Admin | GST Intelligence | Open GST workspace after clients/tasks exist. | Firm GST context loads, client/FY/period can be selected. | `getGSTOperationalIntelligenceSnapshot`. | Partial | P0 |
| GST dataset upload | Staff/Admin | GST Intelligence dataset labels | Upload required dataset files. | Upload session marks datasets uploaded/ready. | `uploadDatasetInSession` stores filename/session state. | Partial | P0 |
| GST engine execution | Staff/Admin | GST Intelligence > Execute | Select client/FY/period/preset, upload required datasets, execute. | Risk scores, reconciliation, resolution center, knowledge graph render. | `gstIntelligenceOrchestrator.runEngine`. | Partial | P0 |
| Notifications | Staff/Admin | Notifications module / Operations drawer | View notification rules and alerts. | Real notifications should list, acknowledge, route, and persist. | `NotificationEngine` uses static metrics/notification cards in `ArchitectureModules`. | Blocked | P0 |
| AI Copilot recommendation | SuperAdmin/Admin/Staff | AI Copilot | Open recommendation context, apply, dismiss, undo. | UI state changes and navigation occurs with action feedback. | `AICommandCenter`, `useOperationalActionExecutor`. | Partial | P1 |
| AI executive brief | SuperAdmin/Admin | AI Copilot > Executive brief | Generate briefing. | Opens Analytics through command action. | `generateBriefing` routes to `open-analytics`; no persisted briefing artifact. | Partial | P1 |
| Document Vault list | Staff/Admin | Document Vault | Open global vault. | Documents load from Supabase by firm. | `DocumentVault`, `getDocuments`. | Ready | P0 |
| Document upload | Staff/Admin | Client Profile / client-scoped vault | Upload PDF/image/spreadsheet with category/type/tags. | File and metadata persist, list refreshes. | Upload requires `clientId`; service `uploadDocument`. | Partial | P0 |
| Document preview | Staff/Admin | Document detail > Preview | Preview PDF/image. | Preview opens if `file_path` is reachable. | `iframe`/`img` preview. | Partial | P1 |
| Document download/archive/restore | Staff/Admin | Document detail action buttons | Click download/archive/restore. | Operation should run and update state. | Buttons visible; handlers not wired in component footer. | Blocked | P1 |

## Pilot Pass Criteria

| Area | Pass Criteria |
|---|---|
| Authentication | All five pilot users can login/logout and return to correct role workspace. |
| Client CRUD | 20 clients created, edited, searched, and scoped to firm. |
| Task lifecycle | 50 tasks created, assigned, transitioned, completed, and audited. |
| Compliance | Real compliance records can be created and filed without sample data. |
| GST | At least one real client GST workflow completes with uploaded datasets and actionable output. |
| Notifications | Operator can see, acknowledge, and route real notifications. |
| Documents | Client documents upload, preview, download, archive, and restore all work. |
| AI Copilot | Recommendations support real navigation and visible feedback; no fake metrics presented as production evidence. |

