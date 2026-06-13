import { UserRole } from '../../types';

export type PredictiveSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ExplainablePrediction {
  id: string;
  title: string;
  severity: PredictiveSeverity;
  probability: number;
  confidence: number;
  reasoning: string[];
  recommendedIntervention: string;
  window: string;
}

export interface WorkflowSimulationInput {
  scenario: 'reassignment' | 'escalation' | 'staffing' | 'redistribution';
  deltaWorkflows: number;
  currentOverdue: number;
  currentEscalations: number;
  availableStaff: number;
}

export interface WorkflowSimulationResult {
  scenario: WorkflowSimulationInput['scenario'];
  projectedOverdue: number;
  projectedEscalations: number;
  projectedSlaRisk: number;
  confidence: number;
  explanation: string[];
}

export interface PredictiveOperationsSnapshot {
  generatedAt: string;
  workflowCompletionPrediction: number;
  workflowDelayForecast: number;
  escalationProbability: number;
  slaBreachForecast: number;
  bottleneckProbability: number;
  taskAgingRisk: number;
  workloadForecastSummary: string;
  explainablePredictions: ExplainablePrediction[];
}

export interface PredictiveTimelineEvent {
  id: string;
  timestamp: string;
  category: 'forecast' | 'risk_window' | 'sla_prediction';
  title: string;
  detail: string;
}

export interface PredictiveAlertEnvelope {
  id: string;
  title: string;
  message: string;
  severity: PredictiveSeverity;
  audienceRole?: UserRole;
}
