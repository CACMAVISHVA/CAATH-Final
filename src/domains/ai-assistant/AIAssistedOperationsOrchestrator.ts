import { User } from '../../types';
import { runtimeAIService } from '../../runtime/production';
import { getOperationalHealthSummary } from '../../services/operationalIntelligenceService';
import { OperationalRecommendation } from './types';

export class AIAssistedOperationsOrchestrator {
  async getRecommendations(user: User): Promise<OperationalRecommendation[]> {
    if (!user.firmId) return [];
    const summary = await getOperationalHealthSummary(user.firmId);

    const prompt = `Generate operational suggestions for workload=${summary.workloadRisk}, approvals=${summary.approvalPressure}, notice=${summary.noticeExposure}.`;
    await runtimeAIService.authorize(prompt, 'governance-model', {
      tenantId: user.firmId,
      actorId: user.id,
      actorRole: user.role,
      workflow: 'operational_recommendations',
      correlationId: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });

    return summary.topInsights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      severity: insight.severity,
      reason: insight.summary,
      suggestedAction: insight.recommendation,
    }));
  }
}

export const aiAssistedOperationsOrchestrator = new AIAssistedOperationsOrchestrator();

