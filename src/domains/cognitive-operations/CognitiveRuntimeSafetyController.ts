import { StrategicRecommendation } from './types';

export class CognitiveRuntimeSafetyController {
  private readonly cache = new Map<string, StrategicRecommendation[]>();

  getCached(tenantId: string): StrategicRecommendation[] | null {
    return this.cache.get(tenantId) ?? null;
  }

  cacheRecommendations(tenantId: string, recommendations: StrategicRecommendation[]): void {
    this.cache.set(tenantId, recommendations.slice(0, 6));
  }

  throttleRecommendations(recommendations: StrategicRecommendation[]): StrategicRecommendation[] {
    const byPriority = [...recommendations].sort((left, right) => {
      const score = (priority: StrategicRecommendation['priority']) => {
        if (priority === 'critical') return 4;
        if (priority === 'high') return 3;
        if (priority === 'medium') return 2;
        return 1;
      };
      return score(right.priority) - score(left.priority);
    });

    return byPriority.slice(0, 4);
  }
}
