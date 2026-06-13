import { CorrelationIdManager } from './CorrelationIdManager';
import { OperationalMetricsAggregator } from './OperationalMetricsAggregator';
import { RuntimeAnomalyHooks } from './RuntimeAnomalyHooks';
import { WorkflowTraceCoordinator } from './WorkflowTraceCoordinator';
import { RuntimeAnomalySignal, RuntimeMetric, RuntimeSeverity, RuntimeTrace } from './types';

const severityWeight: Record<RuntimeSeverity, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
};

export class RuntimeTelemetryEngine {
  readonly correlation = new CorrelationIdManager();
  readonly traces = new WorkflowTraceCoordinator();
  readonly metrics = new OperationalMetricsAggregator();
  readonly anomaly = new RuntimeAnomalyHooks();

  startTrace(trace: Omit<RuntimeTrace, 'traceId' | 'startedAt'> & { traceId?: string }): string {
    const traceId = trace.traceId || this.correlation.create('trace');
    this.traces.start({ ...trace, traceId, startedAt: new Date().toISOString() });
    return traceId;
  }

  recordMetric(metric: Omit<RuntimeMetric, 'recordedAt'>): void {
    this.metrics.ingest({ ...metric, recordedAt: new Date().toISOString() });
  }

  async captureSignal(signal: Omit<RuntimeAnomalySignal, 'detectedAt'>): Promise<void> {
    await this.anomaly.emit({ ...signal, detectedAt: new Date().toISOString() });
    this.recordMetric({ tenantId: signal.tenantId, name: 'runtime.anomaly.score', value: severityWeight[signal.severity], tags: { category: signal.category } });
  }
}

