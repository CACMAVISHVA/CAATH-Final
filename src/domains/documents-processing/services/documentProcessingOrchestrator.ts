import { jobQueueOrchestrator } from '../../../infrastructure/jobs/jobQueueOrchestrator';
import { DocumentProcessingJob } from '../contracts/documentProcessingContracts';

export const documentProcessingOrchestrator = {
  schedule(job: DocumentProcessingJob) {
    jobQueueOrchestrator.enqueue({
      id: job.id,
      tenantId: job.tenantId,
      type: 'document_indexing',
      payload: job,
      attempts: 0,
      maxAttempts: 5,
      scheduledAt: new Date().toISOString(),
      correlationId: job.correlationId,
    });
  },
};

