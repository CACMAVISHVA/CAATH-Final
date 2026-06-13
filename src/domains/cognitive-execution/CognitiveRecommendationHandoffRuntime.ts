import { UserRole } from '../../types';
import { ExplainableExecutionRecommendation, GovernedHandoffAction } from './types';

export class CognitiveRecommendationHandoffRuntime {
  route(
    recommendations: ExplainableExecutionRecommendation[],
    actorRole: UserRole,
  ): GovernedHandoffAction[] {
    return recommendations.map((recommendation) => {
      const highImpact = recommendation.priority === 'critical' || recommendation.priority === 'high';
      const requiresHumanOverride = highImpact && actorRole === 'Staff';
      const governanceStatus = recommendation.confidence < 0.65
        ? 'needs-review'
        : requiresHumanOverride
          ? 'needs-review'
          : 'approved';

      return {
        id: `handoff-${recommendation.id}`,
        recommendationId: recommendation.id,
        taskId: recommendation.taskId,
        actionType: recommendation.priority === 'critical' ? 'route-escalation' : 'boost-priority',
        targetRole: recommendation.priority === 'critical' ? 'Admin' : 'Staff',
        requiresHumanOverride,
        governanceStatus,
      };
    });
  }
}
