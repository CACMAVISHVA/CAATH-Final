# Repository Architecture

## Layering
React Component
-> Domain Service
-> Repository Interface
-> Repository Implementation (Supabase currently)
-> Infrastructure/API Layer
-> Backend/Edge/Supabase

## Interfaces Added
- `IBaseRepository<TEntity, TId>`
- `IAuthRepository`
- `ITicketRepository`
- `IGSTRepository`

## Domain Implementations
- Auth
  - `domains/auth/repositories/SupabaseAuthRepository.ts`
  - `domains/auth/repositories/SupabaseAuthProfileRepository.ts`
  - `domains/auth/services/authService.ts`
- Tickets
  - `domains/tickets/repositories/SupabaseTicketRepository.ts`
  - `domains/tickets/services/ticketService.ts`
- GST
  - `domains/gst/repositories/SupabaseGSTRepository.ts`
  - `domains/gst/services/gstService.ts`

## Design Decisions
- Backward compatibility preserved via façade exports in legacy service paths.
- Repository interfaces isolate backend transport for future swaps (NestJS/microservices/Postgres/API gateway).
- DTO files separate transport payload shapes from UI model assumptions.
