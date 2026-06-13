export interface TenantTelemetrySample {
  tenantId: string;
  metric: string;
  value: number;
  correlationId: string;
  capturedAt: string;
}

export interface HealthScoreSnapshot {
  tenantId: string;
  score: number;
  riskBand: 'low' | 'medium' | 'high';
  measuredAt: string;
}

