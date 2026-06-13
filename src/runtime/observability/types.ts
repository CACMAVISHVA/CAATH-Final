export type RuntimeSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface RuntimeTrace {
  traceId: string;
  tenantId?: string;
  workflowId?: string;
  spanName: string;
  startedAt: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeMetric {
  tenantId?: string;
  name: string;
  value: number;
  tags?: Record<string, string>;
  recordedAt: string;
}

export interface RuntimeAnomalySignal {
  tenantId?: string;
  category: string;
  severity: RuntimeSeverity;
  message: string;
  correlationId: string;
  detectedAt: string;
}

