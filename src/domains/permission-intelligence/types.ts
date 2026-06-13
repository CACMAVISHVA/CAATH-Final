import { UserRole } from '../../types';

export type GovernanceDecision = 'allow' | 'review' | 'deny';
export type WorkflowGovernanceState = 'draft' | 'active' | 'review' | 'approval-gate' | 'escalated' | 'closed';

export interface PermissionContext {
  role: UserRole;
  workspace: string;
  workflowState: WorkflowGovernanceState;
  sensitivity: 'standard' | 'restricted' | 'compliance-sensitive';
  escalationActive: boolean;
}

export interface ExplainablePermissionDecision {
  id: string;
  decision: GovernanceDecision;
  action: string;
  trustScore: number;
  reasoning: string;
  accessContext: string;
  workflowState: WorkflowGovernanceState;
  operationalImpact: string;
  permissionLineage: string[];
  governanceTraceability: string;
}

export interface GovernancePolicy {
  id: string;
  title: string;
  scope: string;
  checkpoint: string;
  enforcement: 'advisory' | 'approval-required' | 'restricted';
}

export interface GovernanceEvent {
  id: string;
  category: 'permission' | 'approval' | 'audit' | 'override' | 'escalation' | 'collaboration' | 'ai';
  actor: string;
  title: string;
  detail: string;
  time: string;
}

