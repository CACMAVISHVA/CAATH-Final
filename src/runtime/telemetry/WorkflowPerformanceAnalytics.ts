import { TenantTelemetrySample } from './types';

export class WorkflowPerformanceAnalytics {
  latencyP95(samples: TenantTelemetrySample[]): number {
    const values = samples.map((sample) => sample.value).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const index = Math.min(values.length - 1, Math.floor(values.length * 0.95));
    return values[index];
  }
}

