# GST Resolution Center Architecture

## Purpose
Centralize post-detection compliance execution into governed, traceable resolution operations.

## Core Domain
- `src/domains/gst-resolution-center/types.ts`
- `src/domains/gst-resolution-center/resolutionEngine.ts`

## Flow
1. GST intelligence execution output is ingested.
2. Compliance issues are derived and severity-scored.
3. Workflow instances are generated per issue type.
4. SLA insights and urgency scoring are calculated.
5. AI remediation recommendations and narratives are attached.
6. Executive summary and runtime governance metadata are emitted.

## Governance
- Auditable workflow lineage
- Explainable AI recommendation rationale
- Permission-aware execution posture
- Runtime-safe async and throttled behavior flags

