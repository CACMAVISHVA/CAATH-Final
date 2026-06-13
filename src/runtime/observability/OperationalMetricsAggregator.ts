import { RuntimeMetric } from './types';

export class OperationalMetricsAggregator {
  private metrics: RuntimeMetric[] = [];

  ingest(metric: RuntimeMetric): void {
    this.metrics.push(metric);
  }

  summarize(metricName: string): number {
    return this.metrics.filter((metric) => metric.name === metricName).reduce((sum, metric) => sum + metric.value, 0);
  }
}

