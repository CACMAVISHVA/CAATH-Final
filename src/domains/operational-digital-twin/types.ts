import { FabricDomain } from '../operational-fabric';

export type SimulationScenarioType =
  | 'workflow_surge'
  | 'task_routing'
  | 'escalation_cascade'
  | 'staff_reassignment'
  | 'sla_pressure'
  | 'capacity_stress'
  | 'compliance_risk';

export interface DigitalTwinStateModel {
  tenantId: string;
  snapshotAt: string;
  workflowBacklog: number;
  openEscalations: number;
  activeStaff: number;
  slaRiskIndex: number;
  queueDepth: number;
  domainPressure: Partial<Record<FabricDomain, number>>;
}

export interface SimulationAssumptions {
  incomingWorkflowVolume: number;
  averageHandleTimeMinutes: number;
  escalationProbability: number;
  reassignmentEfficiencyGain: number;
  staffAvailabilityDelta: number;
}

export interface SimulationScenario {
  id: string;
  tenantId: string;
  type: SimulationScenarioType;
  name: string;
  description: string;
  assumptions: SimulationAssumptions;
  context: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface SimulationStep {
  minute: number;
  queueDepth: number;
  throughput: number;
  escalationCount: number;
  slaBreachRisk: number;
}

export interface ExplainableSimulationResult {
  scenarioId: string;
  generatedAt: string;
  confidence: number;
  assumptions: SimulationAssumptions;
  contributingFactors: string[];
  reasoning: string[];
  traceability: {
    modelVersion: string;
    lineageId: string;
  };
  outputs: {
    projectedBacklog: number;
    projectedEscalations: number;
    projectedSlaBreachRisk: number;
    projectedThroughput: number;
    bottleneckScore: number;
  };
  steps: SimulationStep[];
}

export interface EscalationCascadeResult {
  waveCount: number;
  cumulativeEscalations: number;
  impactedWorkflows: number;
  collapseRisk: number;
  reasoning: string[];
}

export interface CapacityForecast {
  utilization: number;
  requiredStaff: number;
  queuePressure: number;
  throughputForecast: number;
  workloadImbalance: number;
}

export interface OperationalHeatmapCell {
  zone: string;
  pressure: number;
  queueCongestion: number;
  escalationDensity: number;
  workloadImbalance: number;
}

export interface AIPlanningGuidance {
  summary: string;
  recommendations: string[];
  staffingActions: string[];
  escalationPrevention: string[];
}

export interface HistoricalReplayRequest {
  tenantId: string;
  windowStart: string;
  windowEnd: string;
  baselineScenarioType?: SimulationScenarioType;
}

export interface HistoricalReplayResult {
  replayId: string;
  scenarioBaseline: SimulationScenarioType;
  actualBacklog: number;
  predictedBacklog: number;
  actualEscalations: number;
  predictedEscalations: number;
  varianceScore: number;
  insights: string[];
}
