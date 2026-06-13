import { ExplainableCoordinationRecommendation, ThroughputOptimizationSnapshot, WorkloadRebalancePlan } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export class AICoordinationIntelligence {
  recommend(input: {
    tenantId: string;
    plan: WorkloadRebalancePlan;
    throughput: ThroughputOptimizationSnapshot;
    directives: string[];
  }): ExplainableCoordinationRecommendation {
    const confidence = clamp((input.plan.confidence * 0.55) + (input.throughput.queueOptimizationScore * 0.45));
    return {
      id: `coord_ai_${input.tenantId}_${Date.now()}`,
      tenantId: input.tenantId,
      summary: 'Adaptive redistribution is recommended to stabilize SLA pressure and queue congestion.',
      reasoning: [
        `Plan confidence is ${input.plan.confidence}%.`,
        `Queue optimization score is ${input.throughput.queueOptimizationScore}%.`,
        'Routing and cross-team directives were evaluated under governance constraints.',
      ],
      workloadAnalysis: [
        `Projected throughput gain: ${input.plan.netImpact.throughputGain}%.`,
        `Projected congestion reduction: ${input.plan.netImpact.congestionReduction}%.`,
      ],
      operationalContext: [
        `Congestion risk: ${input.throughput.congestionRisk}%.`,
        `Velocity balance score: ${input.throughput.velocityBalanceScore}%.`,
      ],
      predictedImpact: [
        'Expected reduction in SLA congestion lanes.',
        'Lower escalation carryover during peak filing windows.',
        ...input.directives.slice(0, 2),
      ],
      confidence,
    };
  }
}
