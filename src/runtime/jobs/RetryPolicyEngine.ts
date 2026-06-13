import { JobEnvelope } from './types';

export class RetryPolicyEngine {
  shouldRetry(job: JobEnvelope): boolean {
    return job.attempts < job.maxAttempts;
  }

  nextRetryAt(job: JobEnvelope): string {
    const delayMs = Math.min(300_000, 1_000 * 2 ** job.attempts);
    return new Date(Date.now() + delayMs).toISOString();
  }
}

