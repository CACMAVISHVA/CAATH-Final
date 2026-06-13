import { WorkflowEntity } from '../../../services/workflowEngineService';

export type IntegritySeverity = 'critical' | 'warning' | 'info';

export interface WorkflowIntegrityFinding {
  id: string;
  category:
    | 'invalid_transition'
    | 'orphan_workflow'
    | 'ownership_chain'
    | 'notice_task_mismatch'
    | 'approval_inconsistency'
    | 'billing_continuity_gap'
    | 'stuck_workflow'
    | 'escalation_loop';
  severity: IntegritySeverity;
  summary: string;
  entity: WorkflowEntity | 'cross_domain';
  entityId?: string;
  recommendation: string;
}

export interface WorkflowIntegritySummary {
  generatedAt: string;
  workflowHealthScore: number;
  operationalIntegrityScore: number;
  lifecycleReliabilityScore: number;
  counts: {
    invalidTransitions: number;
    orphanWorkflows: number;
    brokenOwnershipChains: number;
    noticeTaskSyncFailures: number;
    approvalInconsistencies: number;
    billingContinuityGaps: number;
    stuckWorkflows: number;
    escalationLoops: number;
    reassignmentInstability: number;
    unresolvedApprovalClusters: number;
    overdueEscalationChains: number;
  };
  findings: WorkflowIntegrityFinding[];
  recoverySuggestions: string[];
}

const norm = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const lifecycleIntegrityPolicyEngine = {
  score(input: {
    invalidTransitions: number;
    orphanWorkflows: number;
    brokenOwnershipChains: number;
    noticeTaskSyncFailures: number;
    approvalInconsistencies: number;
    billingContinuityGaps: number;
    stuckWorkflows: number;
    escalationLoops: number;
    reassignmentInstability: number;
    overdueEscalationChains: number;
  }) {
    const issueLoad =
      input.invalidTransitions * 10 +
      input.orphanWorkflows * 5 +
      input.brokenOwnershipChains * 4 +
      input.noticeTaskSyncFailures * 8 +
      input.approvalInconsistencies * 7 +
      input.billingContinuityGaps * 4 +
      input.stuckWorkflows * 5 +
      input.escalationLoops * 9;

    return {
      workflowHealthScore: norm(100 - issueLoad * 0.45),
      operationalIntegrityScore: norm(
        100 - (input.brokenOwnershipChains * 2 + input.reassignmentInstability * 6 + input.overdueEscalationChains * 5 + input.stuckWorkflows * 3),
      ),
      lifecycleReliabilityScore: norm(
        100 - (input.invalidTransitions * 9 + input.noticeTaskSyncFailures * 8 + input.approvalInconsistencies * 7 + input.billingContinuityGaps * 2),
      ),
    };
  },
};
