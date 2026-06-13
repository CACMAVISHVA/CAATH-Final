export type ObjectiveStatus = 'on-track' | 'at-risk' | 'off-track';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface EnterpriseObjective {
  id: string;
  name: string;
  domain: string;
  parentObjectiveId?: string;
  targetValue: number;
  currentValue: number;
  weight: number;
  status: ObjectiveStatus;
}

export interface ObjectiveConflict {
  id: string;
  objectiveA: string;
  objectiveB: string;
  description: string;
  severity: RecommendationPriority;
}

export interface StrategicTradeoff {
  dimension: string;
  upside: string;
  downside: string;
}

export interface ExplainableReasoningPayload {
  reasoning: string;
  operationalContext: string;
  strategicTradeoffs: StrategicTradeoff[];
  predictedOutcome: string;
  organizationalImpact: string;
  confidence: number;
}

export interface StrategicRecommendation extends ExplainableReasoningPayload {
  id: string;
  title: string;
  priority: RecommendationPriority;
  domain: string;
}

export interface OrganizationalSignal {
  id: string;
  type: 'bottleneck' | 'inefficiency' | 'coordination-friction' | 'behavior-drift';
  domain: string;
  description: string;
  impactScore: number;
  recurrenceScore: number;
}

export interface OperationalIntentSignal {
  id: string;
  workflow: string;
  inferredIntent: string;
  confidence: number;
  objectiveLinks: string[];
}

export interface StrategicSimulationScenario {
  id: string;
  name: string;
  scope: string;
  expectedEfficiencyDelta: number;
  expectedSlaDelta: number;
  investmentLevel: 'low' | 'medium' | 'high';
}

export interface CognitiveMemoryEntry {
  id: string;
  type:
    | 'strategic-decision-lineage'
    | 'executive-action-history'
    | 'optimization-outcome'
    | 'reasoning-history'
    | 'objective-evolution'
    | 'organizational-intelligence';
  referenceId: string;
  summary: string;
  createdAt: string;
}

export interface CognitiveGovernanceAuditRecord {
  id: string;
  recommendationId: string;
  permitted: boolean;
  rationale: string;
  policyTrace: string[];
  createdAt: string;
}

export interface EnterpriseCognitiveInput {
  tenantId: string;
  objectives: EnterpriseObjective[];
  workloadSignals: OrganizationalSignal[];
  intentSignals: OperationalIntentSignal[];
  simulationScenarios: StrategicSimulationScenario[];
}

export interface EnterpriseCognitiveOutput {
  generatedAt: string;
  objectiveAlignmentScore: number;
  objectiveConflicts: ObjectiveConflict[];
  recommendations: StrategicRecommendation[];
  governanceAuditTrail: CognitiveGovernanceAuditRecord[];
  memoryUpdates: CognitiveMemoryEntry[];
}
