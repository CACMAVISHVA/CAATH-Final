# Command Center Boundaries

## Command Center Responsibilities
- Aggregate operational snapshots from domain/intelligence services.
- Prioritize and group operational alerts.
- Provide role-aware summaries and key metrics.
- Emit operational context events and telemetry via abstractions.

## Command Center Non-Responsibilities
- Direct DB access
- Supabase client access
- Auth table querying
- Analytics persistence internals

## Enforced Boundaries
- Infrastructure writes flow through publisher/event abstractions.
- Role logic is policy-driven in dedicated modules.
- Service export in `src/services/roleAwareCommandCenterService.ts` remains compatibility facade only.

## Anti-Monolith Guardrails
- Keep alert generation helpers local and pure.
- Keep role behavior in policy modules.
- Keep event payload contracts typed and versionable.
