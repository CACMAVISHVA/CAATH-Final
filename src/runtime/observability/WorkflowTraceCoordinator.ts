import { RuntimeTrace } from './types';

export class WorkflowTraceCoordinator {
  private traces = new Map<string, RuntimeTrace>();

  start(trace: RuntimeTrace): void {
    this.traces.set(trace.traceId, trace);
  }

  end(traceId: string, metadata?: Record<string, unknown>): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    this.traces.set(traceId, { ...trace, endedAt: new Date().toISOString(), metadata: { ...(trace.metadata || {}), ...(metadata || {}) } });
  }
}

