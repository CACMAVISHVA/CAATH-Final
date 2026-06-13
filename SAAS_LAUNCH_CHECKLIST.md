# SaaS Launch Checklist (Phase 8)

Date: 2026-05-25  
Use: Go/No-Go launch control checklist

## Product Completion
- [ ] Enterprise onboarding wizard fully operational for new CA firm setup.
- [ ] Tenant creation + default workspace provisioning validated.
- [ ] Admin onboarding and role setup validated for Admin/Staff/Client.
- [ ] Workflow initialization templates applied during onboarding.

## Authentication & Access
- [ ] Login UX finalized with robust error messaging and session persistence validation.
- [ ] Password reset and account recovery flow validated.
- [ ] MFA-ready architecture exposed in UX and policy toggles.
- [ ] Device/session visibility panel available to users.
- [ ] Role-aware redirect rules validated post-login.

## Subscription & Monetization
- [ ] Plan lifecycle supports Free/Professional/Enterprise flows.
- [ ] Feature gates enforced consistently across workspace capabilities.
- [ ] Usage limits for clients/staff/storage enforced and surfaced in UI.
- [ ] Trial lifecycle and upgrade flow validated.
- [ ] Billing enforcement actions validated (suspend, grace, reactivate).

## Client Experience
- [ ] Client portal provides task, notice, workflow, and document status visibility.
- [ ] Client collaboration and notification visibility is coherent.
- [ ] Client role access boundaries verified.

## Workflow & Command Experience
- [ ] Core workflows complete with transitions, approvals, escalation, and audit traceability.
- [ ] Command palette supports top operator actions with keyboard-first access.
- [ ] Operational search and quick navigation are consistently available.

## Runtime Reliability
- [ ] Retry, timeout, and graceful degradation paths validated.
- [ ] Queue and realtime runtime cleanup paths validated.
- [ ] Incident fallback playbooks documented and test-run.

## Deployment & DevOps
- [ ] Environment matrix (`dev`, `staging`, `prod`) finalized.
- [ ] CI pipeline for lint/build/type checks enforced.
- [ ] Docker build path validated for staging and production.
- [ ] Release procedure and rollback steps documented.

## Compliance & Audit UX
- [ ] Audit timelines and workflow history are complete and role-aware.
- [ ] Security activity visibility is available to authorized admins.
- [ ] Operational traceability is queryable from primary workflow surfaces.

## Final Release Gate
- [ ] Production simulation scenarios pass for all critical business flows.
- [ ] P0/P1 defects at launch decision date are zero.
- [ ] Stakeholder sign-off complete for Product, Operations, Security, and Engineering.

## Pilot Launch Readiness Addendum

Date added: 2026-06-04

Use this addendum for the final launch preparation gate before internal pilot, first pilot customer, and first paying customer.

### Billing

- [ ] Subscription plans are documented for pilot, professional, and enterprise usage.
- [ ] Trial, activation, suspension, grace period, and reactivation behavior is validated.
- [ ] Billing hooks are tested in staging or explicitly marked manual for pilot.
- [ ] Usage limits for users, clients, storage, and GST activity are visible to admins.
- [ ] Customer invoice and payment responsibility is assigned before paid launch.

### Support

- [ ] Support owner is assigned for each pilot customer.
- [ ] P0/P1 escalation path is tested internally.
- [ ] Support ticket intake captures role, module, tenant, reproduction steps, and severity.
- [ ] Pilot response SLA is documented and shared with users.
- [ ] Customer feedback is reviewed daily during pilot.

### Security

- [ ] Authentication behavior is validated across approved hostnames.
- [ ] Role permissions are tested for Super Admin, Admin, Manager, Staff, and Client.
- [ ] Two-firm tenant isolation test is completed.
- [ ] Sensitive environment variables are not exposed to client-side runtime.
- [ ] Audit and security activity visibility is available to authorized admins.

### Deployment

- [ ] Staging deployment matches production configuration.
- [ ] Production environment variables are reviewed.
- [ ] Build, lint, and type checks pass before release.
- [ ] Rollback procedure is documented and rehearsed.
- [ ] Release owner and launch window are confirmed.

### Backups

- [ ] Database backup schedule is confirmed.
- [ ] Restore test is completed or scheduled before paid launch.
- [ ] Document/file storage backup policy is documented.
- [ ] Retention policy is documented for client, task, compliance, GST, and document data.
- [ ] Backup ownership is assigned.

### Monitoring

- [ ] Runtime error monitoring is enabled or manual pilot monitoring is assigned.
- [ ] Login failures, failed saves, and failed uploads are reviewed daily.
- [ ] P0/P1 bug registry is reviewed at the end of each pilot day.
- [ ] Support and observation logs are connected to launch decisions.
- [ ] Usage tracking identifies unused navigation and low-value widgets.

### Documentation

- [ ] Customer onboarding playbook is complete.
- [ ] Pilot execution plan is complete.
- [ ] Bug triage system is complete.
- [ ] Known GST certification constraint is documented for pilot users.
- [ ] Go-live scorecard is reviewed before customer onboarding.

### Launch Gates

| Milestone | Gate |
|---|---|
| Internal pilot | Checklist reviewed, pilot users identified, support loop ready |
| First pilot customer | Zero P0, contained P1 list, tenant isolation verified |
| First paying customer | 30-day reliability evidence, billing/support/backup process proven |
