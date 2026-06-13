import { operationalIntelligenceFabricOrchestrator } from '../operational-fabric';
import { AIAssistedSimulationGuidance } from './AIAssistedSimulationGuidance';
import { EscalationCascadeSimulator } from './EscalationCascadeSimulator';
import { HistoricalReplayEngine } from './HistoricalReplayEngine';
import { OperationalCapacityModeler } from './OperationalCapacityModeler';
import { OperationalHeatmapEngine } from './OperationalHeatmapEngine';
import { SimulationGovernanceLayer } from './SimulationGovernanceLayer';
import { SimulationRuntimeIsolation } from './SimulationRuntimeIsolation';
import { WorkflowSimulationEngine } from './WorkflowSimulationEngine';
import {
  AIPlanningGuidance,
  CapacityForecast,
  DigitalTwinStateModel,
  EscalationCascadeResult,
  ExplainableSimulationResult,
  HistoricalReplayRequest,
  HistoricalReplayResult,
  OperationalHeatmapCell,
  SimulationScenario,
} from './types';

export class OperationalDigitalTwinOrchestrator {
  private readonly workflowEngine = new WorkflowSimulationEngine();
  private readonly capacityModeler = new OperationalCapacityModeler();
  private readonly escalationSimulator = new EscalationCascadeSimulator();
  private readonly heatmapEngine = new OperationalHeatmapEngine();
  private readonly guidanceEngine = new AIAssistedSimulationGuidance();
  private readonly governance = new SimulationGovernanceLayer();
  private readonly runtimeIsolation = new SimulationRuntimeIsolation();
  private readonly replayEngine = new HistoricalReplayEngine();

  modelState(tenantId: string): DigitalTwinStateModel {
    const snapshot = operationalIntelligenceFabricOrchestrator.getExecutiveSnapshot(tenantId);
    const workflowBacklog = snapshot.kpis.federatedEventCount;
    const openEscalations = snapshot.topRisks.filter((item) => item.signal.toLowerCase().includes('escalation')).length;
    return {
      tenantId,
      snapshotAt: snapshot.generatedAt,
      workflowBacklog,
      openEscalations,
      activeStaff: 8,
      slaRiskIndex: Math.min(100, snapshot.kpis.highRiskCorrelationCount * 15),
      queueDepth: Math.min(250, Math.round(workflowBacklog * 1.2)),
      domainPressure: Object.fromEntries(snapshot.heatmap.map((cell) => [cell.domain, cell.intensity])),
    };
  }

  runScenario(scenario: SimulationScenario): {
    simulation: ExplainableSimulationResult;
    capacity: CapacityForecast;
    escalation: EscalationCascadeResult;
    heatmap: OperationalHeatmapCell[];
    guidance: AIPlanningGuidance;
  } {
    const governanceCheck = this.governance.assertIsolatedScenario(scenario);
    if (!governanceCheck.allowed) {
      throw new Error(`Simulation governance blocked scenario: ${governanceCheck.reasons.join('; ')}`);
    }
    if (!this.runtimeIsolation.canRun(scenario)) {
      throw new Error('Simulation throttle limit reached. Retry after cooldown.');
    }

    const cacheKey = `${scenario.tenantId}:${scenario.id}`;
    const cached = this.runtimeIsolation.getCached<{
      simulation: ExplainableSimulationResult;
      capacity: CapacityForecast;
      escalation: EscalationCascadeResult;
      heatmap: OperationalHeatmapCell[];
      guidance: AIPlanningGuidance;
    }>(cacheKey);
    if (cached) return cached;

    const state = this.modelState(scenario.tenantId);
    const simulation = this.workflowEngine.simulate(scenario, state.workflowBacklog, state.openEscalations);
    simulation.traceability.lineageId = this.governance.lineageId(scenario);
    const capacity = this.capacityModeler.forecast(state, scenario);
    const escalation = this.escalationSimulator.simulate(simulation);
    const heatmap = this.heatmapEngine.build({
      zones: ['GST', 'Workflow Core', 'Escalation Desk', 'Compliance Lane', 'Executive Monitoring'],
      queueDepth: simulation.outputs.projectedBacklog,
      escalations: escalation.cumulativeEscalations,
      workloadImbalance: capacity.workloadImbalance,
    });
    const guidance = this.guidanceEngine.recommend({ simulation, capacity, escalation });

    const result = { simulation, capacity, escalation, heatmap, guidance };
    this.runtimeIsolation.setCached(cacheKey, result);
    return result;
  }

  replayHistorical(request: HistoricalReplayRequest): HistoricalReplayResult {
    return this.replayEngine.replay(request);
  }
}

export const operationalDigitalTwinOrchestrator = new OperationalDigitalTwinOrchestrator();
