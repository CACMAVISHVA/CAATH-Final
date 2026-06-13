import type { UserRole } from '../../types';

export type AICopilotDomain =
  | 'workflow'
  | 'executive'
  | 'governance'
  | 'memory'
  | 'analytics'
  | 'integration'
  | 'collaboration';

export type AIAssistanceType =
  | 'next-best-action'
  | 'escalation-assist'
  | 'queue-prioritization'
  | 'sla-intervention'
  | 'risk-explanation'
  | 'executive-briefing'
  | 'governance-recommendation';

export type AIRecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type AIRecommendationState = 'active' | 'accepted' | 'dismissed' | 'monitoring';

export interface AICopilotContext {
  userRole: UserRole;
  workspaceId: string;
  activeWorkflow: string;
  telemetrySnapshot: string;
  governanceScope: string;
  memorySources: string[];
}

export interface AIRecommendation {
  id: string;
  title: string;
  type: AIAssistanceType;
  domain: AICopilotDomain;
  priority: AIRecommendationPriority;
  confidence: number;
  summary: string;
  nextAction: string;
  targetRoute: string;
  reasoning: string;
  sourceWorkflows: string[];
  contextLineage: string[];
  governanceRationale: string;
  permissionScope: UserRole[];
  auditTrail: string[];
  operationalImpact: string;
  state: AIRecommendationState;
}

export interface AIExecutiveBriefing {
  id: string;
  title: string;
  narrative: string;
  confidence: number;
  metricLineage: string[];
  decisionSupport: string;
  governanceNote: string;
}

export interface AIGovernancePolicy {
  id: string;
  name: string;
  enforcement: 'blocking' | 'review' | 'advisory';
  description: string;
  evidenceRequired: string[];
}

export interface AIRuntimeSafeguard {
  id: string;
  name: string;
  status: 'active' | 'monitoring' | 'review';
  purpose: string;
}

export interface AICopilotAnalytics {
  recommendationEffectiveness: number;
  trustScore: number;
  workflowOptimizationImpact: number;
  adoptionRate: number;
  governanceCompliance: number;
}

export interface AICopilotSnapshot {
  context: AICopilotContext;
  recommendations: AIRecommendation[];
  executiveBriefings: AIExecutiveBriefing[];
  governancePolicies: AIGovernancePolicy[];
  safeguards: AIRuntimeSafeguard[];
  analytics: AICopilotAnalytics;
}
