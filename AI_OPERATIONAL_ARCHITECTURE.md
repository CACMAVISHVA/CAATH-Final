# AI Operational Architecture

Date: 2026-05-25

## Goal
Enable AI-assisted operational execution without creating chatbot-centric or tightly coupled systems.

## Domain
- `src/domains/ai-operations/`
  - `AIOperationsOrchestrator.ts`
  - `AIRuntimeSafeguards.ts`
  - `types.ts`

## Architecture Layers
1. Governance + safety authorization via `AIGovernanceRuntime`.
2. Runtime safeguards via per-tenant throttling.
3. Operational signal ingestion from:
   - operational health
   - assistance recommendations
   - GST dashboard intelligence
   - onboarding progression
4. AI recommendation assembly and prioritization.
5. Delivery into dashboard intelligence panels and notification nudges.

## Boundary Guarantees
- AI runtime is separated from workflow services.
- Recommendations are advisory and governed.
- Notification nudges use existing notification runtime.
- Timeline output is read-model oriented, not direct workflow mutation.
