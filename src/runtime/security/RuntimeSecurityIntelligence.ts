import { SessionIntelligenceEngine } from './SessionIntelligenceEngine';
import { SuspiciousActivityDetector } from './SuspiciousActivityDetector';
import { TenantRiskSnapshot } from './types';
import { WorkflowRiskScoringEngine } from './WorkflowRiskScoringEngine';

export class RuntimeSecurityIntelligence {
  private detector = new SuspiciousActivityDetector();
  private sessions = new SessionIntelligenceEngine();
  private workflows = new WorkflowRiskScoringEngine();
  private tenantRisk = new Map<string, number>();

  ingestSession(tenantId: string, signal: { sessionId: string; impossibleTravel: boolean; rapidFailures: boolean }): TenantRiskSnapshot {
    const sessionScore = this.sessions.evaluate({ ...signal, tenantId });
    const next = Math.min(100, (this.tenantRisk.get(tenantId) || 0) + sessionScore);
    this.tenantRisk.set(tenantId, next);
    return this.snapshot(tenantId);
  }

  ingestWorkflow(tenantId: string, factors: { escalations: number; failures: number; privilegedActions: number }): TenantRiskSnapshot {
    const workflowScore = this.workflows.score(factors);
    const next = Math.min(100, (this.tenantRisk.get(tenantId) || 0) + workflowScore / 2);
    this.tenantRisk.set(tenantId, next);
    return this.snapshot(tenantId);
  }

  markSignal(tenantId: string, score: number): TenantRiskSnapshot {
    const suspicious = this.detector.isSuspicious({
      tenantId,
      type: 'abuse',
      score,
      occurredAt: new Date().toISOString(),
    });
    const delta = suspicious ? 20 : 5;
    const next = Math.min(100, (this.tenantRisk.get(tenantId) || 0) + delta);
    this.tenantRisk.set(tenantId, next);
    return this.snapshot(tenantId);
  }

  private snapshot(tenantId: string): TenantRiskSnapshot {
    const riskScore = this.tenantRisk.get(tenantId) || 0;
    const level = riskScore >= 85 ? 'critical' : riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
    return { tenantId, riskScore, level, updatedAt: new Date().toISOString() };
  }

  trackedTenantCount(): number {
    return this.tenantRisk.size;
  }
}
