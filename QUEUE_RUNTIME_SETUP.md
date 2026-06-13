# Queue Runtime Setup

## Implemented Runtime
- `RuntimeQueueService` executes scheduled jobs in-process.
- `JobRuntimeOrchestrator` retains retry and dead-letter logic.
- Notification retry tasks are pushed to `notification_delivery` jobs.

## Processing Model
- Tick interval: 1 second.
- Retry strategy: bounded exponential backoff from runtime retry policy.
- Dead-letter tracking available via runtime health snapshot.

## Production Hardening Applied
- Timeout wrappers for persistence calls.
- Retry wrapper for append-only audit writes.
- Error metrics logged for failed jobs.

## Migration Path
1. Replace scheduler with BullMQ + Redis.
2. Separate API and worker runtimes.
3. Add queue partitioning by tenant and domain.
