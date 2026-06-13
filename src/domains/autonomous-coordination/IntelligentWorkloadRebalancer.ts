import { AdaptiveWorkflowRouter } from './AdaptiveWorkflowRouter';
import { CoordinationContext, CoordinationWorkItem, TeamCapacityProfile, WorkloadRebalancePlan } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export class IntelligentWorkloadRebalancer {
  private readonly router = new AdaptiveWorkflowRouter();

  buildPlan(input: {
    context: CoordinationContext;
    queue: CoordinationWorkItem[];
    teams: TeamCapacityProfile[];
  }): WorkloadRebalancePlan {
    const sortedQueue = [...input.queue].sort((a, b) => {
      if (a.priority === b.priority) return a.slaMinutesRemaining - b.slaMinutesRemaining;
      const rank = { critical: 4, high: 3, medium: 2, low: 1 };
      return rank[b.priority] - rank[a.priority];
    });

    const actions = sortedQueue
      .slice(0, 25)
      .map((item) => this.router.route(item, input.teams, input.context))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const throughputGain = clamp(actions.reduce((sum, action) => sum + action.predictedImpact.throughputGain, 0) / Math.max(1, actions.length));
    const slaRiskReduction = clamp(actions.reduce((sum, action) => sum + action.predictedImpact.slaRiskReduction, 0) / Math.max(1, actions.length));
    const congestionReduction = clamp(actions.reduce((sum, action) => sum + action.predictedImpact.congestionReduction, 0) / Math.max(1, actions.length));
    const confidence = clamp(actions.reduce((sum, action) => sum + action.confidence, 0) / Math.max(1, actions.length));

    return {
      planId: `rebalance_${input.context.tenantId}_${Date.now()}`,
      tenantId: input.context.tenantId,
      generatedAt: new Date().toISOString(),
      actions,
      netImpact: { throughputGain, slaRiskReduction, congestionReduction },
      confidence,
    };
  }
}
