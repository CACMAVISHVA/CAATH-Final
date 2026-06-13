import { JobEnvelope, JobRuntimeOrchestrator } from '../jobs';
import { runtimeObservabilityService } from './RuntimeObservabilityService';

type JobHandler = (job: JobEnvelope) => Promise<void>;

export class RuntimeQueueService {
  private orchestrator = new JobRuntimeOrchestrator();
  private handlers = new Map<string, JobHandler>();
  private pending: JobEnvelope[] = [];
  private timer: number | null = null;

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  enqueue(job: JobEnvelope): void {
    this.pending.push(job);
    this.orchestrator.enqueue(job);
    this.orchestrator.scheduler.schedule(job);
  }

  start(): void {
    if (this.timer) return;
    this.timer = window.setInterval(() => {
      void this.tick();
    }, 1000);
  }

  stop(): void {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  pendingCount(): number {
    return this.pending.length;
  }

  deadLetterCount(): number {
    return this.orchestrator.getDeadLetters().length;
  }

  private async tick(): Promise<void> {
    const due = this.orchestrator.scheduler.popDue();
    if (due.length === 0) return;

    for (const job of due) {
      const idx = this.pending.findIndex((item) => item.id === job.id);
      if (idx >= 0) this.pending.splice(idx, 1);

      const handler = this.handlers.get(job.type);
      if (!handler) continue;

      const startedAt = Date.now();
      try {
        await handler(job);
        runtimeObservabilityService.metric('runtime.queue.job_duration_ms', Date.now() - startedAt, { type: job.type }, job.tenantId);
      } catch (error) {
        runtimeObservabilityService.error('runtime_queue_job_failed', { jobId: job.id, type: job.type, error: String(error) });
        const retry = this.orchestrator.fail(job, String(error));
        if (retry) {
          this.pending.push(retry);
          this.orchestrator.scheduler.schedule(retry);
        }
      }
    }
  }
}

export const runtimeQueueService = new RuntimeQueueService();
