import {
  ObjectiveConflict,
  OperationalIntentSignal,
  OrganizationalSignal,
  StrategicRecommendation,
  StrategicSimulationScenario,
} from './types';

interface RecommendationInput {
  conflicts: ObjectiveConflict[];
  frictionSignals: OrganizationalSignal[];
  intentDriftSignals: OperationalIntentSignal[];
  prioritizedScenarios: StrategicSimulationScenario[];
}

export class AIRecommendationEngine {
  generate(input: RecommendationInput): StrategicRecommendation[] {
    const recommendations: StrategicRecommendation[] = [];

    input.conflicts.slice(0, 2).forEach((conflict, index) => {
      recommendations.push({
        id: `conflict-${index + 1}-${conflict.id}`,
        title: `Resolve conflict: ${conflict.objectiveA} vs ${conflict.objectiveB}`,
        priority: conflict.severity,
        domain: 'objective-coordination',
        reasoning: `Detected strategic misalignment between ${conflict.objectiveA} and ${conflict.objectiveB}.`,
        operationalContext: conflict.description,
        strategicTradeoffs: [
          {
            dimension: 'Speed vs stability',
            upside: 'Faster conflict resolution restores execution focus.',
            downside: 'Short-term resource reshuffling may reduce local velocity.',
          },
        ],
        predictedOutcome: 'Improved objective alignment and reduced SLA instability.',
        organizationalImpact: 'Cross-team priority clarity improves.',
        confidence: 0.79,
      });
    });

    if (input.frictionSignals.length > 0) {
      const topFriction = input.frictionSignals[0];
      recommendations.push({
        id: `friction-${topFriction.id}`,
        title: `Reduce bottleneck in ${topFriction.domain}`,
        priority: 'high',
        domain: topFriction.domain,
        reasoning: `Recurring friction signal identified in ${topFriction.domain}.`,
        operationalContext: topFriction.description,
        strategicTradeoffs: [
          {
            dimension: 'Capacity allocation',
            upside: 'Targeted pod support can reduce escalations.',
            downside: 'Temporary staffing shift impacts adjacent queues.',
          },
        ],
        predictedOutcome: 'Reduced recurring bottlenecks and escalation volume.',
        organizationalImpact: 'Improves throughput consistency for dependent workflows.',
        confidence: 0.75,
      });
    }

    if (input.intentDriftSignals.length > 0) {
      recommendations.push({
        id: 'intent-alignment-1',
        title: 'Re-align workflow intent with strategic objectives',
        priority: 'medium',
        domain: 'operational-intent',
        reasoning: 'Multiple workflow signals show weak objective linkage or low intent confidence.',
        operationalContext: `${input.intentDriftSignals.length} workflows require intent-to-objective mapping validation.`,
        strategicTradeoffs: [
          {
            dimension: 'Governance rigor',
            upside: 'Clear intent mapping improves explainability and accountability.',
            downside: 'Additional review gates may add minor overhead.',
          },
        ],
        predictedOutcome: 'Higher strategic coherence and fewer execution detours.',
        organizationalImpact: 'Teams receive clearer directional guidance.',
        confidence: 0.71,
      });
    }

    const topScenario = input.prioritizedScenarios[0];
    if (topScenario) {
      recommendations.push({
        id: `scenario-${topScenario.id}`,
        title: `Pilot strategic plan: ${topScenario.name}`,
        priority: topScenario.investmentLevel === 'high' ? 'medium' : 'high',
        domain: 'strategic-planning',
        reasoning: 'Simulation profile indicates the strongest combined efficiency and SLA benefit.',
        operationalContext: `${topScenario.scope} with expected efficiency delta ${topScenario.expectedEfficiencyDelta.toFixed(1)}%.`,
        strategicTradeoffs: [
          {
            dimension: 'Investment vs return',
            upside: 'Forecasted measurable gains in operational stability.',
            downside: 'Requires up-front change management effort.',
          },
        ],
        predictedOutcome: 'Improved operational resilience under peak load.',
        organizationalImpact: 'Sharper prioritization across execution pods.',
        confidence: 0.74,
      });
    }

    return recommendations;
  }
}
