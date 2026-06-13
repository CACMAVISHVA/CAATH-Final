import { EscalationCascadeResult, ExplainableSimulationResult } from './types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export class EscalationCascadeSimulator {
  simulate(result: ExplainableSimulationResult): EscalationCascadeResult {
    const waveCount = Math.max(1, Math.ceil(result.outputs.projectedEscalations / 8));
    const dependencyFactor = Math.max(1, Math.ceil(result.outputs.bottleneckScore / 20));
    const cumulativeEscalations = result.outputs.projectedEscalations * dependencyFactor;
    const impactedWorkflows = result.outputs.projectedBacklog + Math.round(cumulativeEscalations * 0.4);
    const collapseRisk = clamp((cumulativeEscalations * 0.35) + (result.outputs.projectedSlaBreachRisk * 0.7));

    return {
      waveCount,
      cumulativeEscalations,
      impactedWorkflows,
      collapseRisk,
      reasoning: [
        `Escalation waves derive from projected escalations: ${result.outputs.projectedEscalations}.`,
        `Dependency factor estimated from bottleneck score: ${result.outputs.bottleneckScore}.`,
        'Collapse risk reflects escalation accumulation and SLA breach pressure.',
      ],
    };
  }
}
