# CAATH Operator Friction Report

Generated: 2026-06-04

## Executive Summary

CAATH has enough working surfaces for a controlled internal UAT, but a first pilot firm will encounter friction where workflows depend on hidden Supabase setup, seeded records, or architecture/demo modules. The highest friction is not navigation anymore; it is knowing what data must exist before a workflow becomes usable.

## Friction Register

| Workflow | Friction Type | What The Operator Experiences | Root Cause | Severity |
|---|---|---|---|---|
| First login | Hidden configuration | User cannot log in unless Supabase Auth user and `public.users` profile exist. | User provisioning is admin/setup driven. | P0 |
| Role assignment | Manual intervention | Creating Admin/Staff from the public signup path fails by design. | `accountOnboardingService` restricts unauthenticated role creation to Client. | P0 |
| Firm setup | Hidden configuration | Firm workspace must exist before meaningful internal user/client/task workflows. | Pilot tenant seed/setup is not fully self-service. | P0 |
| Client creation | Minor technical validation | PAN/GSTIN format must be correct. | Good validation, but no inline formatting helper beyond error text. | P1 |
| Staff assignment | Hidden dependency | Task assignment only works if active users exist in same firm. | Assignee selector depends on seeded/provisioned staff. | P0 |
| Compliance lifecycle | Manual workaround | Operator sees sample clients/filings, not actual firm compliance records. | `ComplianceTracker` uses `SAMPLE_COMPLIANCES`. | P0 |
| GST workflow | Technical knowledge | Operator must understand required GST datasets, period, presets, and modules. | GST flow is powerful but specialist-oriented. | P1 |
| GST upload | Hidden limitation | Upload marks dataset name in session; persistence/parsing is not obvious to user. | `uploadDatasetInSession` appears session-state driven. | P0 |
| Notifications | False operational confidence | Metrics/cards show rules and scheduled sends, but no visible acknowledge/create/route workflow. | Static `NotificationEngine` surface. | P0 |
| AI Copilot | Abstract action model | Apply guidance changes UI/navigates but may not create durable workflow output. | Recommendations are generated from orchestrator snapshot and local state. | P1 |
| Document upload | Hidden context | Global Document Vault does not show Upload unless `clientId` is provided. | Upload is client-context gated. | P1 |
| Document actions | Dead action risk | Download, archive, restore icons are visible but lack wired handlers in detail footer. | Component imports lifecycle services but buttons are not connected. | P1 |
| Search/operations | Discoverability | Command actions work best if user already knows terminology. | Global search and operations drawer are power-user surfaces. | P2 |

## Workflows Requiring Manual Intervention

| Workflow | Required Manual Step |
|---|---|
| Firm onboarding | Create firm record/subscription in Supabase or use seed script. |
| Internal user creation | Create Supabase Auth user and assign role/profile through governed/admin route. |
| Seeded pilot users | Create auth users manually with strong passwords before running seed profile script. |
| Compliance records | Replace sample compliance data with real tenant records before pilot. |
| GST files | Provide clean GSTR/vendor/sales/purchase datasets in expected formats. |
| Supabase storage | Ensure document buckets and RLS policies are configured before upload UAT. |

## Workflows Requiring Technical Knowledge

| Workflow | Knowledge Needed |
|---|---|
| Login troubleshooting | Browser origin/session behavior and Supabase user/profile distinction. |
| GST Intelligence | Dataset dependencies, filing periods, GSTIN/PAN conventions, reconciliation terminology. |
| Role testing | CAATH role map: GodAdmin, SuperAdmin, Admin, Staff, Client. |
| Document Vault | Client-scoped upload requirement and storage configuration. |
| Tenant isolation | Supabase RLS and firm_id scoped data validation. |

## Friction Reduction Priorities

| Priority | Recommendation |
|---|---|
| P0 | Replace Compliance Tracker sample data with real persisted compliance lifecycle before pilot. |
| P0 | Provide a controlled pilot provisioning checklist for firm, five users, roles, and seed data. |
| P0 | Confirm GST uploads persist and parse real files, not only session filename state. |
| P0 | Replace static Notification Engine with real notification list/action workflow or remove from pilot scope. |
| P1 | Wire Document Vault download/archive/restore buttons or hide them until operational. |
| P1 | Add visible setup-state messaging when a workflow depends on missing firm/users/clients. |

