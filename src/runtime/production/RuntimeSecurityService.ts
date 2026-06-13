import { RuntimeSecurityIntelligence } from '../security';
import { runtimeObservabilityService } from './RuntimeObservabilityService';

export class RuntimeSecurityService {
  readonly runtime = new RuntimeSecurityIntelligence();

  trackAuthAnomaly(tenantId: string, signal: { sessionId: string; impossibleTravel: boolean; rapidFailures: boolean }) {
    const snapshot = this.runtime.ingestSession(tenantId, signal);
    runtimeObservabilityService.metric('runtime.security.risk_score', snapshot.riskScore, { level: snapshot.level }, tenantId);
    return snapshot;
  }

  trackAbuseSignal(tenantId: string, score: number) {
    const snapshot = this.runtime.markSignal(tenantId, score);
    runtimeObservabilityService.metric('runtime.security.risk_score', snapshot.riskScore, { level: snapshot.level }, tenantId);
    return snapshot;
  }

  trackedTenantCount(): number {
    return this.runtime.trackedTenantCount();
  }
}

export const runtimeSecurityService = new RuntimeSecurityService();
