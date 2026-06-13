# Event System

## Foundation
- `src/events/eventBus.ts` provides in-app pub/sub.
- Event catalog defined in `src/events/types.ts`.

## Initial Event Types
- `TICKET_CREATED`
- `GST_NOTICE_RECEIVED`
- `CLIENT_ADDED`
- `PORTAL_ACCESSED`
- `AUDIT_EVENT_RECORDED`
- `NOTIFICATION_SENT`
- `WORKFLOW_TRIGGERED`

## Evolution Path
- Replace in-memory bus with broker-backed transport.
- Add outbox pattern for reliable domain event publishing.
- Add idempotency keys and replay-safe consumers.
