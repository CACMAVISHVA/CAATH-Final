import { operationalDigitalTwinOrchestrator, SimulationScenario } from '../operational-digital-twin';
import { DigitalTwinDashboardViewModel } from './types';

const riskLevel = (risk: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (risk >= 80) return 'critical';
  if (risk >= 60) return 'high';
  if (risk >= 40) return 'medium';
  return 'low';
};

export class DigitalTwinDashboardOrchestrator {
  buildViewModel(input: {
    scenario: SimulationScenario;
    withReplay?: { windowStart: string; windowEnd: string };
  }): DigitalTwinDashboardViewModel {
    const run = operationalDigitalTwinOrchestrator.runScenario(input.scenario);
    const replay = input.withReplay
      ? operationalDigitalTwinOrchestrator.replayHistorical({
        tenantId: input.scenario.tenantId,
        windowStart: input.withReplay.windowStart,
        windowEnd: input.withReplay.windowEnd,
        baselineScenarioType: input.scenario.type,
      })
      : undefined;

    return {
      generatedAt: new Date().toISOString(),
      controls: {
        canRunSimulation: true,
        isolatedRuntime: true,
        simulationPlaybackEnabled: true,
      },
      scenarioCard: {
        scenarioId: input.scenario.id,
        title: input.scenario.name,
        confidence: run.simulation.confidence,
        riskLevel: riskLevel(run.simulation.outputs.projectedSlaBreachRisk),
        projectedBacklog: run.simulation.outputs.projectedBacklog,
        projectedEscalations: run.simulation.outputs.projectedEscalations,
      },
      simulation: run.simulation,
      capacity: run.capacity,
      escalation: run.escalation,
      heatmap: run.heatmap,
      guidance: run.guidance,
      replay,
    };
  }
}

export const digitalTwinDashboardOrchestrator = new DigitalTwinDashboardOrchestrator();
