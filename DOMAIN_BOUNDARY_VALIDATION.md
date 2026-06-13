# Domain Boundary Validation

## Boundary Rules Checked
1. Domain services must not import `supabase` directly.
2. Domain services must delegate persistence to repositories.
3. UI compatibility must be preserved via service façade exports.
4. Cross-domain calls should remain orchestration-level (not DB-level).

## Validation Outcome
- `tasks` domain: PASS
  - Business logic retained in domain service.
  - All DB operations routed through `TaskRepository`.
- `notices` domain: PASS
  - Notice persistence moved to `NoticeRepository`.
  - Task linkage remains domain orchestration only.
- `clients` domain: PASS
  - Client persistence and lookup routed via `ClientRepository`.
  - Validation/business rules remain in domain service.

## Remaining Cross-Cutting Considerations
- Observability and workflow orchestration integrations remain service-level collaborators; they are not persistence leaks.
- Legacy non-domain services may still use direct Supabase and should be migrated in future phases where relevant.

## Compliance Status
- Phase 3.2.1 repository purity target achieved for migrated domain services.
