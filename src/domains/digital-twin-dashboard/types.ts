import {
  AIPlanningGuidance,
  CapacityForecast,
  EscalationCascadeResult,
  ExplainableSimulationResult,
  HistoricalReplayResult,
  OperationalHeatmapCell,
} from '../operational-digital-twin';

export interface SimulationScenarioCard {
  scenarioId: string;
  title: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  projectedBacklog: number;
  projectedEscalations: number;
}

export interface DigitalTwinDashboardViewModel {
  generatedAt: string;
  controls: {
    canRunSimulation: boolean;
    isolatedRuntime: boolean;
    simulationPlaybackEnabled: boolean;
  };
  scenarioCard: SimulationScenarioCard;
  simulation: ExplainableSimulationResult;
  capacity: CapacityForecast;
  escalation: EscalationCascadeResult;
  heatmap: OperationalHeatmapCell[];
  guidance: AIPlanningGuidance;
  replay?: HistoricalReplayResult;
}
