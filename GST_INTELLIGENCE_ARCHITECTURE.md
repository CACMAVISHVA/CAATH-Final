# GST Intelligence Architecture

Date: 2026-05-25

## Overview
CAATH GST Intelligence is upgraded into a workflow-driven engine with explicit separation between:
- UI workflow composition
- Intelligence orchestration
- Risk scoring
- AI insight generation
- Operational telemetry

## Implementation Slice
- UI: `src/components/GSTIntelligenceCenter.tsx`
- Orchestrator: `src/domains/gst-intelligence/GSTIntelligenceOrchestrator.ts`
- Presets/Module Registry: `src/domains/gst-intelligence/enginePresets.ts`
- Types/Contracts: `src/domains/gst-intelligence/types.ts`

## Request Flow
1. User selects client + filing context + preset + modules.
2. Orchestrator resolves GST snapshot via `getGSTOperationalIntelligenceSnapshot`.
3. Orchestrator enriches with health/delay analytics.
4. Risk scoring engine computes compliance/audit/vendor/efficiency/consistency scores.
5. AI insight layer produces governed recommendation cards.
6. Telemetry event is recorded for auditability and operational monitoring.
7. Engine response returns structured intelligence result for UI rendering.

## Boundary Rules
- No monolithic GST logic in component.
- Reconciliation and filing data remain in existing GST services.
- Orchestrator composes domain signals; UI only renders and triggers actions.
- AI output is recommendation-only and governance-noted.

## Future Evolution
- Add dedicated repository for enriched GST profile attributes.
- Add policy-driven module execution permissions by role/plan.
- Add async queue mode for heavy intelligence runs.
