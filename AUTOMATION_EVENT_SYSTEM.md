# Automation Event System

## Typed Event Contracts
File: `src/domains/workflows/events/automationEvents.ts`

Events:
- `TASK_OVERDUE`
- `NOTICE_ESCALATED`
- `CLIENT_STATUS_CHANGED`
- `GST_DEADLINE_APPROACHING`
- `COMPLIANCE_RISK_DETECTED`

## Emission Path
- Orchestrators emit typed events through workflow event emitter and event bus.
- Metadata uses centralized tenant/actor/correlation context.

## Observability
- Automation runs and lifecycle summaries are logged to enterprise activity stream.
- Correlation IDs and tenant IDs are attached for traceability.
