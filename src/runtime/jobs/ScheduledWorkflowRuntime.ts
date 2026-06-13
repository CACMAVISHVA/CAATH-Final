import { JobEnvelope } from './types';

export class ScheduledWorkflowRuntime {
  private scheduled = new Map<string, JobEnvelope>();

  schedule(job: JobEnvelope): void {
    this.scheduled.set(job.id, job);
  }

  due(nowIso = new Date().toISOString()): JobEnvelope[] {
    return [...this.scheduled.values()].filter((job) => job.scheduledAt <= nowIso);
  }

  popDue(nowIso = new Date().toISOString()): JobEnvelope[] {
    const due = this.due(nowIso);
    for (const job of due) {
      this.scheduled.delete(job.id);
    }
    return due;
  }
}
