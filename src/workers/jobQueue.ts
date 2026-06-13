import { logger } from '../infrastructure/monitoring/logger';
import { WorkerJob, WorkerJobName } from './jobTypes';

type JobHandler<T = unknown> = (job: WorkerJob<T>) => Promise<void>;

const handlers = new Map<WorkerJobName, JobHandler>();
const queue: WorkerJob[] = [];

export const workerQueue = {
  register(name: WorkerJobName, handler: JobHandler) {
    handlers.set(name, handler);
  },
  enqueue<T>(job: Omit<WorkerJob<T>, 'attempts' | 'createdAt'>) {
    queue.push({ ...job, attempts: 0, createdAt: new Date().toISOString() });
  },
  async runNext() {
    const job = queue.shift();
    if (!job) return;

    const handler = handlers.get(job.name);
    if (!handler) {
      logger.warn('worker_handler_missing', { jobName: job.name, jobId: job.id });
      return;
    }

    try {
      await handler(job);
    } catch (error) {
      job.attempts += 1;
      if (job.attempts < job.maxAttempts) {
        queue.push(job);
      }
      logger.error('worker_job_failed', { jobId: job.id, jobName: job.name, attempts: job.attempts, error: String(error) });
    }
  },
};
