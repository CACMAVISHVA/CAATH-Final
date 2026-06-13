# Analytics Event System

## Purpose
Decouple analytics collection from workflow/operations orchestration while retaining rich operational signals.

## Event Contracts
File: `src/domains/analytics/events/analyticsEvents.ts`

Events:
- `TASK_COMPLETION_METRIC`
- `NOTICE_RESPONSE_TIME`
- `CLIENT_ACTIVITY_SIGNAL`
- `WORKFLOW_LATENCY_EVENT`
- `COLLABORATION_ACTIVITY_EVENT`

## Publisher
File: `src/domains/analytics/services/analyticsEventPublisher.ts`

Responsibilities:
- normalize analytics event payloads
- send telemetry via infrastructure pipeline
- preserve tenant and actor metadata

## Metadata
- analytics metadata builder: `src/domains/analytics/context/analyticsMetadata.ts`
- tenant context source: `src/domains/workflows/context/tenantContext.ts`
