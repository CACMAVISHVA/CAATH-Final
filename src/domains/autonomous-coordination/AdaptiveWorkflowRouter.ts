import { CoordinationContext, CoordinationWorkItem, RoutingDecision, TeamCapacityProfile } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export class AdaptiveWorkflowRouter {
  route(item: CoordinationWorkItem, teams: TeamCapacityProfile[], context: CoordinationContext): RoutingDecision | null {
    const eligible = teams
      .filter((team) => team.availableCapacity > 0)
      .map((team) => ({
        team,
        skillMatch: item.requiredSkillTags.filter((tag) => team.skills.includes(tag)).length,
        slaPressureRelief: clamp((100 - team.utilization) + Math.min(40, item.slaMinutesRemaining / 3)),
        riskFit: clamp(100 - Math.abs(item.riskScore - (team.escalationLoad * 10))),
      }))
      .sort((a, b) => (b.skillMatch + b.slaPressureRelief + b.riskFit) - (a.skillMatch + a.slaPressureRelief + a.riskFit));

    const winner = eligible[0]?.team;
    if (!winner) return null;

    const mode: RoutingDecision['routingMode'] =
      item.priority === 'critical' ? 'escalation_sensitive'
        : item.slaMinutesRemaining <= 60 ? 'sla_aware'
          : item.riskScore >= 70 ? 'risk_aware'
            : item.requiredSkillTags.length > 0 ? 'skill_aware'
              : 'priority_aware';

    const throughputGain = clamp((winner.availableCapacity * 9) - context.queuePressureIndex * 0.2);
    const slaRiskReduction = clamp((context.escalationIndex * 0.4) + (winner.availableCapacity * 7));
    const congestionReduction = clamp((100 - winner.utilization) * 0.7);

    return {
      workItemId: item.id,
      sourceTeamId: item.assignedTeam,
      destinationTeamId: winner.teamId,
      routingMode: mode,
      predictedImpact: { throughputGain, slaRiskReduction, congestionReduction },
      confidence: clamp(60 + (eligible[0]?.skillMatch ?? 0) * 8 + winner.availableCapacity * 4),
      reasoning: [
        `Selected team ${winner.teamName} with capacity ${winner.availableCapacity}.`,
        `Routing mode ${mode} due to priority ${item.priority} and SLA window ${item.slaMinutesRemaining} minutes.`,
        `Expected congestion relief from utilization baseline ${winner.utilization}%.`,
      ],
    };
  }
}
