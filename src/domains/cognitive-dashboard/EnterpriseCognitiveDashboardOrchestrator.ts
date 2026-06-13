import { EnterpriseCognitiveDashboardInput, EnterpriseCognitiveDashboardViewModel } from './types';

export class EnterpriseCognitiveDashboardOrchestrator {
  toViewModel(input: EnterpriseCognitiveDashboardInput): EnterpriseCognitiveDashboardViewModel {
    const { cognitiveOutput } = input;
    const conflictCount = cognitiveOutput.objectiveConflicts.length;
    const recommendationCount = cognitiveOutput.recommendations.length;
    const governancePassed = cognitiveOutput.governanceAuditTrail.filter((entry) => entry.permitted).length;
    const governancePassRate = cognitiveOutput.governanceAuditTrail.length
      ? Math.round((governancePassed / cognitiveOutput.governanceAuditTrail.length) * 100)
      : 100;

    return {
      generatedAt: cognitiveOutput.generatedAt,
      objectiveAlignmentScore: cognitiveOutput.objectiveAlignmentScore,
      heatmap: [
        this.buildCell('Objective Alignment', 100 - cognitiveOutput.objectiveAlignmentScore),
        this.buildCell('Conflict Pressure', conflictCount * 20),
        this.buildCell('Recommendation Load', recommendationCount * 15),
      ],
      panels: [
        {
          id: 'alignment',
          title: 'Strategic Alignment',
          value: `${cognitiveOutput.objectiveAlignmentScore}%`,
          tone: cognitiveOutput.objectiveAlignmentScore >= 75 ? 'stable' : 'watch',
        },
        {
          id: 'conflicts',
          title: 'Objective Conflicts',
          value: `${conflictCount}`,
          tone: conflictCount > 2 ? 'critical' : conflictCount > 0 ? 'watch' : 'stable',
        },
        {
          id: 'governance',
          title: 'Governance Pass Rate',
          value: `${governancePassRate}%`,
          tone: governancePassRate >= 90 ? 'stable' : governancePassRate >= 75 ? 'watch' : 'critical',
        },
      ],
      insights: cognitiveOutput.recommendations.map((recommendation) => ({
        id: recommendation.id,
        recommendation: recommendation.title,
        priority: recommendation.priority,
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning,
      })),
      governancePassRate,
    };
  }

  private buildCell(lane: string, intensity: number) {
    const boundedIntensity = Math.max(0, Math.min(100, Math.round(intensity)));
    return {
      lane,
      intensity: boundedIntensity,
      status: boundedIntensity >= 70 ? 'critical' : boundedIntensity >= 40 ? 'watch' : 'stable',
    } as const;
  }
}

export const enterpriseCognitiveDashboardOrchestrator = new EnterpriseCognitiveDashboardOrchestrator();
