import { UserRole } from '../../types';

export type AutomationRisk = 'low' | 'medium' | 'high';
export type AutomationTriggerType = 'sla_breach' | 'workflow_stagnation' | 'escalation_condition' | 'approval_delay' | 'queue_overload' | 'operational_anomaly';
export type AutomationExecutionState = 'recommended' | 'auto-approved' | 'approval-required' | 'throttled' | 'blocked' | 'executed' | 'rolled-back';

export interface AutomationTrigger {
  id: string;
  type: AutomationTriggerType;
  title: string;
  reason: string;
  severity: AutomationRisk;
  domain: 'gst' | 'workflow' | 'governance' | 'collaboration' | 'memory' | 'workspace';
  signalStrength: number;
}

export interface AutomationGovernancePolicy {
  id: string;
  title: string;
  maxRiskWithoutApproval: AutomationRisk;
  allowedRoles: UserRole[];
  approvalThreshold: number;
  throttleWindowMinutes: number;
  rationale: string;
}

export interface AutonomousExecutionPlan {
  id: string;
  triggerId: string;
  title: string;
  nextStep: string;
  sequence: string[];
  risk: AutomationRisk;
  confidence: number;
  state: AutomationExecutionState;
  approvalRequired: boolean;
  overrideAvailable: boolean;
  governanceRationale: string;
  lineage: string[];
}

export interface AutomationTimelineEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  state: AutomationExecutionState;
}

export interface AutomationAnalytics {
  effectivenessScore: number;
  manualWorkReduced: string;
  accelerationRate: string;
  trustScore: number;
  preventedStorms: number;
}

export interface AutonomousOperationsSnapshot {
  generatedAt: string;
  triggers: AutomationTrigger[];
  policies: AutomationGovernancePolicy[];
  plans: AutonomousExecutionPlan[];
  timeline: AutomationTimelineEvent[];
  analytics: AutomationAnalytics;
}
