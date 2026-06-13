import { DeadLetterJob, JobEnvelope } from './jobContracts';

export class JobQueueOrchestrator {
  private queue: JobEnvelope[] = [];
  private deadLetter: DeadLetterJob[] = [];

  enqueue<TPayload>(job: JobEnvelope<TPayload>) {
    this.queue.push(job as JobEnvelope);
  }

  dequeue(): JobEnvelope | undefined {
    return this.queue.shift();
  }

  retry(job: JobEnvelope, reason: string) {
    if (job.attempts + 1 >= job.maxAttempts) {
      this.deadLetter.push({ job: { ...job, attempts: job.attempts + 1 }, reason, failedAt: new Date().toISOString() });
      return;
    }
    this.queue.push({ ...job, attempts: job.attempts + 1 });
  }

  getDeadLetters(): DeadLetterJob[] {
    return [...this.deadLetter];
  }
}

export const jobQueueOrchestrator = new JobQueueOrchestrator();

