export interface SecuritySignal {
  tenantId: string;
  actorId?: string;
  type: 'auth' | 'workflow' | 'session' | 'abuse';
  score: number;
  details?: Record<string, unknown>;
  occurredAt: string;
}

export interface TenantRiskSnapshot {
  tenantId: string;
  riskScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  updatedAt: string;
}

