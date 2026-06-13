import { HealthScoreSnapshot, TenantTelemetrySample } from './types';

export class OperationalHealthScorer {
  score(tenantId: string, samples: TenantTelemetrySample[]): HealthScoreSnapshot {
    const average = samples.length === 0 ? 100 : samples.reduce((sum, sample) => sum + sample.value, 0) / samples.length;
    const score = Math.max(0, Math.min(100, Math.round(100 - average)));
    const riskBand = score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high';
    return { tenantId, score, riskBand, measuredAt: new Date().toISOString() };
  }
}

