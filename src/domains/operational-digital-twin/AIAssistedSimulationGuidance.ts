import { AIPlanningGuidance, CapacityForecast, EscalationCascadeResult, ExplainableSimulationResult } from './types';

export class AIAssistedSimulationGuidance {
  recommend(input: {
    simulation: ExplainableSimulationResult;
    capacity: CapacityForecast;
    escalation: EscalationCascadeResult;
  }): AIPlanningGuidance {
    const recommendations: string[] = [];
    const staffingActions: string[] = [];
    const escalationPrevention: string[] = [];

    if (input.capacity.utilization >= 85) {
      recommendations.push('Activate temporary staff pool for filing-period surge lanes.');
      staffingActions.push(`Add at least ${Math.max(1, input.capacity.requiredStaff - 8)} staff equivalent to reduce overload.`);
    }
    if (input.simulation.outputs.bottleneckScore >= 65) {
      recommendations.push('Rebalance high-risk workflow queues using governed reassignment.');
      staffingActions.push('Shift senior reviewers to top congestion lanes for next 24 hours.');
    }
    if (input.escalation.collapseRisk >= 70) {
      recommendations.push('Trigger escalation dampening protocol and proactive SLA triage.');
      escalationPrevention.push('Establish fast-track resolution window for unresolved dependency clusters.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current staffing posture and monitor peak-hour queue drift.');
      escalationPrevention.push('Run low-frequency escalation audits during non-peak windows.');
    }

    return {
      summary: `Simulation indicates ${input.simulation.outputs.projectedBacklog} projected backlog with ${input.simulation.outputs.projectedSlaBreachRisk}% SLA risk.`,
      recommendations,
      staffingActions,
      escalationPrevention,
    };
  }
}
