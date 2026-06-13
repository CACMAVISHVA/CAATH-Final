import { CognitiveCommandCenterInput, CognitiveCommandCenterViewModel } from './types';

export class CognitiveCommandCenterOrchestrator {
  toViewModel(input: CognitiveCommandCenterInput): CognitiveCommandCenterViewModel {
    const { output } = input;
    const approved = output.handoffActions.filter((action) => action.governanceStatus === 'approved').length;
    const total = Math.max(output.handoffActions.length, 1);
    const objectiveTrackingScore = Math.round((approved / total) * 100);

    return {
      generatedAt: output.generatedAt,
      objectiveTrackingScore,
      heatmap: [
        this.cell('Execution Pressure', output.influencedQueue.slice(0, 6).reduce((a, b) => a + b.urgencyScore, 0) / 6),
        this.cell('Escalation Routing', output.influencedQueue.slice(0, 6).reduce((a, b) => a + b.escalationScore, 0) / 6),
        this.cell('Governed Handoff', 100 - objectiveTrackingScore),
      ],
      panels: [
        { id: 'influences', title: 'Cognitive Influences', value: String(output.influences.length), tone: output.influences.length > 8 ? 'watch' : 'stable' },
        { id: 'review', title: 'Needs Override', value: String(output.handoffActions.filter((a) => a.requiresHumanOverride).length), tone: output.handoffActions.some((a) => a.requiresHumanOverride) ? 'watch' : 'stable' },
        { id: 'alignment', title: 'Objective Execution', value: `${objectiveTrackingScore}%`, tone: objectiveTrackingScore < 70 ? 'critical' : objectiveTrackingScore < 85 ? 'watch' : 'stable' },
      ],
      topActions: output.recommendations.slice(0, 4).map((recommendation) => {
        const action = output.handoffActions.find((candidate) => candidate.recommendationId === recommendation.id);
        return {
          id: recommendation.id,
          title: recommendation.title,
          priority: recommendation.priority,
          confidence: recommendation.confidence,
          governanceStatus: action?.governanceStatus ?? 'needs-review',
        };
      }),
      timeline: output.timeline.map((item) => ({ id: item.id, summary: item.summary, createdAt: item.createdAt })),
    };
  }

  private cell(lane: string, raw: number) {
    const intensity = Math.max(0, Math.min(100, Math.round(raw)));
    return {
      lane,
      intensity,
      status: intensity >= 75 ? 'critical' : intensity >= 45 ? 'watch' : 'stable',
    } as const;
  }
}

export const cognitiveCommandCenterOrchestrator = new CognitiveCommandCenterOrchestrator();
