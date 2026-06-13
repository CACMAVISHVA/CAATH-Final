import { ExplainableSimulationResult, SimulationScenario, SimulationStep } from './types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export class WorkflowSimulationEngine {
  simulate(scenario: SimulationScenario, baselineBacklog: number, baselineEscalations: number): ExplainableSimulationResult {
    const steps: SimulationStep[] = [];
    const incoming = scenario.assumptions.incomingWorkflowVolume;
    const avgHandle = Math.max(5, scenario.assumptions.averageHandleTimeMinutes);
    const productivityMultiplier = 1 + (scenario.assumptions.reassignmentEfficiencyGain / 100);
    const staffDelta = scenario.assumptions.staffAvailabilityDelta;
    const effectiveThroughput = Math.max(1, ((60 / avgHandle) * productivityMultiplier) * Math.max(1, 8 + staffDelta));

    let queueDepth = baselineBacklog + incoming;
    let escalationCount = baselineEscalations;
    for (let minute = 0; minute <= 180; minute += 30) {
      const processed = Math.min(queueDepth, Math.round(effectiveThroughput * 0.5));
      queueDepth = Math.max(0, queueDepth - processed + (minute === 0 ? 0 : Math.round(incoming * 0.05)));
      escalationCount += Math.round(queueDepth * (scenario.assumptions.escalationProbability / 1000));
      const slaBreachRisk = clamp((queueDepth * 0.8) + (escalationCount * 0.6));
      steps.push({
        minute,
        queueDepth,
        throughput: processed,
        escalationCount,
        slaBreachRisk,
      });
    }

    const projectedBacklog = steps[steps.length - 1]?.queueDepth ?? queueDepth;
    const projectedEscalations = steps[steps.length - 1]?.escalationCount ?? escalationCount;
    const projectedSlaBreachRisk = clamp((projectedBacklog * 0.7) + (projectedEscalations * 0.5));
    const projectedThroughput = steps.reduce((sum, step) => sum + step.throughput, 0);
    const bottleneckScore = clamp((projectedBacklog * 0.4) + (projectedSlaBreachRisk * 0.6));

    return {
      scenarioId: scenario.id,
      generatedAt: new Date().toISOString(),
      confidence: clamp(72 + scenario.assumptions.reassignmentEfficiencyGain - Math.abs(staffDelta) * 2),
      assumptions: scenario.assumptions,
      contributingFactors: [
        `Incoming workflow volume: ${incoming}`,
        `Average handle time: ${avgHandle} minutes`,
        `Staff availability delta: ${staffDelta}`,
      ],
      reasoning: [
        'Simulation uses queue-depth decay with staffing-adjusted throughput.',
        'Escalation growth is derived from unresolved queue depth and escalation probability.',
        'SLA pressure reflects combined queue and escalation trend over 3-hour horizon.',
      ],
      traceability: {
        modelVersion: 'digital-twin.workflow.v1',
        lineageId: `workflow:${scenario.tenantId}:${scenario.id}`,
      },
      outputs: {
        projectedBacklog,
        projectedEscalations,
        projectedSlaBreachRisk,
        projectedThroughput,
        bottleneckScore,
      },
      steps,
    };
  }
}
