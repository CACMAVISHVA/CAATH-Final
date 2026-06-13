import { UserRole } from '../../types';

export type AIOpsPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AIOperationalRecommendation {
  id: string;
  title: string;
  summary: string;
  recommendedAction: string;
  priority: AIOpsPriority;
  source: 'workflow' | 'compliance' | 'workload' | 'automation' | 'onboarding' | 'search';
}

export interface AITaskPriorityItem {
  taskId: string;
  title: string;
  priorityScore: number;
  urgency: AIOpsPriority;
  reason: string;
}

export interface AIWorkflowOptimizationSnapshot {
  efficiencyScore: number;
  bottleneckRisk: number;
  escalationPressure: number;
  delayPrediction: number;
  recommendations: AIOperationalRecommendation[];
}

export interface AIComplianceNarrative {
  title: string;
  narrative: string;
  riskBand: 'low' | 'moderate' | 'high';
  explainabilityNote: string;
}

export interface AIIntelligentNudge {
  id: string;
  title: string;
  message: string;
  priority: AIOpsPriority;
  audienceRole?: UserRole;
}

export interface AIOpsDashboardIntelligence {
  summary: string;
  recommendations: AIOperationalRecommendation[];
  complianceNarrative: AIComplianceNarrative;
  optimization: AIWorkflowOptimizationSnapshot;
}

export interface AIOperationalTimelineEvent {
  id: string;
  timestamp: string;
  type: 'ai_insight' | 'workflow_risk' | 'automation_hint';
  title: string;
  detail: string;
}
