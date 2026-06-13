import { CognitiveMemoryEntry, StrategicRecommendation } from './types';

export class CognitiveOperationalMemory {
  private readonly memory: CognitiveMemoryEntry[] = [];

  recordRecommendations(recommendations: StrategicRecommendation[]): CognitiveMemoryEntry[] {
    const createdAt = new Date().toISOString();
    const entries = recommendations.map((recommendation) => ({
      id: `mem-${recommendation.id}-${createdAt}`,
      type: 'reasoning-history' as const,
      referenceId: recommendation.id,
      summary: recommendation.reasoning,
      createdAt,
    }));

    this.memory.push(...entries);
    return entries;
  }

  getRecent(limit = 20): CognitiveMemoryEntry[] {
    return this.memory.slice(-limit).reverse();
  }
}
