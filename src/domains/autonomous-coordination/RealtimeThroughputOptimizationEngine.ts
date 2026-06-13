import { CoordinationContext, ThroughputOptimizationSnapshot, WorkloadRebalancePlan } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export class RealtimeThroughputOptimizationEngine {
  evaluate(context: CoordinationContext, plan: WorkloadRebalancePlan): ThroughputOptimizationSnapshot {
    const throughputScore = clamp((context.throughputIndex * 0.6) + (plan.netImpact.throughputGain * 0.4));
    const queueOptimizationScore = clamp((plan.netImpact.congestionReduction * 0.7) + ((100 - context.queuePressureIndex) * 0.3));
    const velocityBalanceScore = clamp((plan.netImpact.throughputGain + plan.netImpact.slaRiskReduction) / 2);
    const congestionRisk = clamp((context.queuePressureIndex * 0.6) + (100 - plan.netImpact.congestionReduction) * 0.4);

    const recommendations: string[] = [];
    if (congestionRisk >= 70) recommendations.push('Throttle low-priority inflow and reserve capacity for SLA-critical lanes.');
    if (throughputScore <= 50) recommendations.push('Increase temporary staffing or reduce handoff friction in routing lanes.');
    if (queueOptimizationScore >= 75) recommendations.push('Current redistribution strategy is stable; continue under governance window.');

    return {
      tenantId: context.tenantId,
      generatedAt: new Date().toISOString(),
      throughputScore,
      queueOptimizationScore,
      velocityBalanceScore,
      congestionRisk,
      recommendations,
    };
  }
}
