import { QueueRoutingLayer } from './QueueRoutingLayer';
import { RetryPolicyEngine } from './RetryPolicyEngine';
import { ScheduledWorkflowRuntime } from './ScheduledWorkflowRuntime';
import { WorkerLifecycleCoordinator } from './WorkerLifecycleCoordinator';
import { DeadLetterEntry, JobEnvelope } from './types';

export class JobRuntimeOrchestrator {
  private queues = new Map<string, JobEnvelope[]>();
  private deadLetter: DeadLetterEntry[] = [];

  constructor(
    private readonly routing = new QueueRoutingLayer(),
    private readonly retry = new RetryPolicyEngine(),
    readonly workers = new WorkerLifecycleCoordinator(),
    readonly scheduler = new ScheduledWorkflowRuntime(),
  ) {}

  enqueue(job: JobEnvelope): void {
    const queueName = this.routing.resolveQueue(job);
    const queue = this.queues.get(queueName) || [];
    queue.push(job);
    this.queues.set(queueName, queue);
  }

  fail(job: JobEnvelope, reason: string): JobEnvelope | undefined {
    if (!this.retry.shouldRetry(job)) {
      this.deadLetter.push({ job, reason, failedAt: new Date().toISOString() });
      return undefined;
    }
    return { ...job, attempts: job.attempts + 1, scheduledAt: this.retry.nextRetryAt(job) };
  }

  getDeadLetters(): DeadLetterEntry[] {
    return [...this.deadLetter];
  }
}

