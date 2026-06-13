import { FabricDomain } from '../operational-fabric';
import { UserRole } from '../../types';

export interface CoordinationWorkItem {
  id: string;
  tenantId: string;
  workflowType: string;
  domain: FabricDomain;
  priority: 'low' | 'medium' | 'high' | 'critical';
  slaMinutesRemaining: number;
  riskScore: number;
  requiredSkillTags: string[];
  assignedTeam?: string;
}

export interface TeamCapacityProfile {
  teamId: string;
  teamName: string;
  availableCapacity: number;
  utilization: number;
  skills: string[];
  escalationLoad: number;
}

export interface CoordinationContext {
  tenantId: string;
  actorRole: UserRole;
  queuePressureIndex: number;
  throughputIndex: number;
  escalationIndex: number;
  stabilizationWindowMinutes: number;
}

export interface RoutingDecision {
  workItemId: string;
  sourceTeamId?: string;
  destinationTeamId: string;
  routingMode: 'skill_aware' | 'sla_aware' | 'risk_aware' | 'priority_aware' | 'escalation_sensitive';
  predictedImpact: {
    throughputGain: number;
    slaRiskReduction: number;
    congestionReduction: number;
  };
  confidence: number;
  reasoning: string[];
}

export interface WorkloadRebalancePlan {
  planId: string;
  tenantId: string;
  generatedAt: string;
  actions: RoutingDecision[];
  netImpact: {
    throughputGain: number;
    slaRiskReduction: number;
    congestionReduction: number;
  };
  confidence: number;
}

export interface ThroughputOptimizationSnapshot {
  tenantId: string;
  generatedAt: string;
  throughputScore: number;
  queueOptimizationScore: number;
  velocityBalanceScore: number;
  congestionRisk: number;
  recommendations: string[];
}

export interface ExplainableCoordinationRecommendation {
  id: string;
  tenantId: string;
  summary: string;
  reasoning: string[];
  workloadAnalysis: string[];
  operationalContext: string[];
  predictedImpact: string[];
  confidence: number;
}

export interface CoordinationGovernanceDecision {
  allowed: boolean;
  requiresHumanApproval: boolean;
  reasons: string[];
}

export interface CoordinationTimelineItem {
  id: string;
  tenantId: string;
  timestamp: string;
  actionType: 'redistribution' | 'routing_change' | 'escalation_sync' | 'throughput_optimization';
  title: string;
  detail: string;
  confidence: number;
}

export interface SynchronizationState {
  tenantId: string;
  synchronizedDomains: FabricDomain[];
  lastSyncAt: string;
  driftScore: number;
}
