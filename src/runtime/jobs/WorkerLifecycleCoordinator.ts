export interface WorkerDescriptor {
  id: string;
  queue: string;
  startedAt: string;
  status: 'idle' | 'running' | 'paused' | 'draining';
}

export class WorkerLifecycleCoordinator {
  private workers = new Map<string, WorkerDescriptor>();

  register(worker: WorkerDescriptor): void {
    this.workers.set(worker.id, worker);
  }

  updateStatus(workerId: string, status: WorkerDescriptor['status']): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    this.workers.set(workerId, { ...worker, status });
  }

  list(queue?: string): WorkerDescriptor[] {
    const all = [...this.workers.values()];
    return queue ? all.filter((worker) => worker.queue === queue) : all;
  }
}

