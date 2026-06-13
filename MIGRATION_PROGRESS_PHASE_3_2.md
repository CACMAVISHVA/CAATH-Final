# Migration Progress Phase 3.2

## Completed
- Added domain service locations for next major coupling block:
  - `src/domains/tasks/services/taskDomainService.ts`
  - `src/domains/notices/services/noticeDomainService.ts`
  - `src/domains/clients/services/clientDomainService.ts`
- Introduced compatibility facades preserving existing imports:
  - `src/services/taskService.ts`
  - `src/services/noticeService.ts`
  - `src/services/clientService.ts`
- Added repository skeletons for `tasks`, `notices`, `clients`.
- Added DTOs and validation for `tasks` and `clients` (plus notice DTO).
- Extended query key architecture for `clients`, `tasks`, `notices`.
- Added cache lifecycle and invalidation helper foundations.
- Extended domain events with:
  - `CLIENT_CREATED`
  - `TASK_ASSIGNED`
  - `TASK_COMPLETED`
  - `NOTICE_RECEIVED`
  - `NOTICE_ESCALATED`

## Remaining (Intentional Progressive Scope)
- Full repository-method adoption inside all relocated domain services.
- Migration of `taskActivityService` direct Supabase coupling.
- Cross-domain utility extraction for shared staff lookup and audit logging.

## Compatibility Status
- Existing UI/service import contracts preserved.
- No route/component API breakage introduced.
