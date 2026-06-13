import { OperationalHealthScorer } from './OperationalHealthScorer';
import { WorkflowPerformanceAnalytics } from './WorkflowPerformanceAnalytics';
import { HealthScoreSnapshot, TenantTelemetrySample } from './types';

export class EnterpriseOperationalTelemetry {
  private samples: TenantTelemetrySample[] = [];
  private scorer = new OperationalHealthScorer();
  private performance = new WorkflowPerformanceAnalytics();

  ingest(sample: TenantTelemetrySample): void {
    this.samples.push(sample);
  }

  health(tenantId: string): HealthScoreSnapshot {
    return this.scorer.score(tenantId, this.samples.filter((sample) => sample.tenantId === tenantId));
  }

  orchestrationLatencyP95(tenantId: string): number {
    const scoped = this.samples.filter((sample) => sample.tenantId === tenantId && sample.metric === 'orchestration.latency_ms');
    return this.performance.latencyP95(scoped);
  }
}

