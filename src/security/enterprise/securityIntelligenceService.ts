export interface SecuritySignal {
  tenantId: string;
  actorId?: string;
  signal: 'suspicious_login' | 'device_mismatch' | 'session_anomaly' | 'permission_spike';
  score: number;
  metadata?: Record<string, unknown>;
}

export const securityIntelligenceService = {
  evaluate(signal: SecuritySignal): { riskBand: 'low' | 'medium' | 'high' } {
    if (signal.score >= 80) return { riskBand: 'high' };
    if (signal.score >= 40) return { riskBand: 'medium' };
    return { riskBand: 'low' };
  },
};

