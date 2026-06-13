export interface ObservabilityEvent {
  tenantId?: string;
  traceId: string;
  event: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MetricPoint {
  tenantId?: string;
  metric: string;
  value: number;
  labels?: Record<string, string>;
  recordedAt: string;
}

