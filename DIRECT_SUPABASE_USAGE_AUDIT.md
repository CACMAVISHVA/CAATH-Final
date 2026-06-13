# Direct Supabase Usage Audit

## Scope
Audit date: 2026-05-24
Command baseline: `rg -n "supabase\.(from|auth|storage)|\.from\(" src`

## Summary
- Direct Supabase usage is still widespread across legacy services and some UI/context modules.
- High-coupling areas are concentrated in `services/`, with a small number in `components/` and `context/`.
- Phase 3.1 migrated critical architecture paths for `auth`, `tickets`, and key `gst` services to domain service/repository abstractions.

## Critical Migration Areas
- `src/context/AuthContext.tsx` (auth/session/profile coupling): migrated to `domains/auth/services/authService`.
- `src/components/PayrollWorkspace.tsx` (step-up auth): migrated to `authService.login`.
- `src/pages/AuthPage.tsx` (direct sign-in): migrated to `authService.login`.
- `src/services/supportEscalationTicketingService.ts` (ticket data flow): migrated to domain ticket service facade.
- `src/services/gst/gstFilingService.ts`, `src/services/gst/gstReconciliationService.ts`, `src/services/gst/gstOperationalIntelligenceService.ts`, `src/services/gst/gstHealthScoreService.ts`: moved to GST domain service/repository-backed flow.

## High-Risk Coupling Zones (remaining)
- `src/services/taskService.ts`, `src/services/dashboardService.ts`, `src/services/noticeService.ts`, `src/services/clientService.ts`, `src/services/documents/*`, `src/services/invoice/*`, `src/services/payrollService.ts`.
- `src/components/GodAdminDashboard.tsx`, `src/components/ClientMaster.tsx`, `src/components/ArchitectureModules.tsx` (component-level data coupling).
- `src/context/UIContext.tsx` (user preference persistence via direct Supabase).

## Safe Temporary Areas
- Internal security/audit/observability helpers where direct persistence is intentionally centralized and non-UI-facing.
- Legacy service modules already encapsulated behind exported APIs and not directly called from many UI nodes.

## Migration Priority Order
1. Task/Notice/Client orchestration services.
2. Documents + Invoice/Billing service families.
3. Dashboard aggregate queries.
4. Remaining component-level direct calls.
5. Shared preference and utility persistence calls.

## Risk Notes
- Biggest architecture risk is mixed patterns in legacy services, not immediate UI breakage.
- Main operational risk is inconsistent error handling across direct callers; standardized AppError hierarchy now introduced for progressive adoption.
