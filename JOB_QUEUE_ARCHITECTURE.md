# Job Queue Architecture

## Foundation
- Contracts: `src/infrastructure/jobs/jobContracts.ts`
- Queue orchestration: `src/infrastructure/jobs/jobQueueOrchestrator.ts`

## Behaviors
- Typed job envelopes with correlation metadata.
- Retry tracking per job.
- Dead-letter capture after max attempts.

## Workload Targets
- AI processing
- OCR/indexing
- GST processing
- Notification delivery
- Analytics aggregation

## Future Infrastructure
- BullMQ/Redis adapter
- Scheduled cron workflows
- Distributed worker pools
