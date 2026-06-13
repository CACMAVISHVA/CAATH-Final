import { CoordinationContext, CoordinationGovernanceDecision, WorkloadRebalancePlan } from './types';

export class CoordinationGovernanceLayer {
  evaluate(context: CoordinationContext, plan: WorkloadRebalancePlan): CoordinationGovernanceDecision {
    const reasons: string[] = [];
    if (plan.actions.length > 20) reasons.push('High redistribution count exceeds safe guardrail.');
    if (context.queuePressureIndex >= 90) reasons.push('Extreme queue pressure requires explicit human checkpoint.');
    if (plan.confidence < 55) reasons.push('Low confidence coordination plan.');

    const requiresHumanApproval = reasons.length > 0 || context.actorRole !== 'Admin';
    return {
      allowed: plan.actions.length > 0,
      requiresHumanApproval,
      reasons,
    };
  }
}
