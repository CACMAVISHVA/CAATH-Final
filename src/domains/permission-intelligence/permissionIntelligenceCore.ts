import { UserRole } from '../../types';
import { ExplainablePermissionDecision, GovernancePolicy, PermissionContext } from './types';

const privilegedRoles: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin'];

export const evaluateOperationalPermission = (action: string, context: PermissionContext): ExplainablePermissionDecision => {
  const privileged = privilegedRoles.includes(context.role);
  const restricted = context.sensitivity !== 'standard';
  const gated = context.workflowState === 'approval-gate' || context.escalationActive;
  const decision = privileged ? (restricted && gated ? 'review' : 'allow') : restricted || gated ? 'review' : 'allow';

  return {
    id: `perm-${action.toLowerCase().replace(/\s+/g, '-')}`,
    decision,
    action,
    trustScore: decision === 'allow' ? 92 : decision === 'review' ? 76 : 35,
    reasoning: privileged
      ? 'Role has governance authority, but sensitive or escalated workflows still require traceable checkpoints.'
      : 'Role can participate operationally, with sensitive actions routed through contextual review.',
    accessContext: `${context.role} in ${context.workspace} | ${context.sensitivity}`,
    workflowState: context.workflowState,
    operationalImpact: gated ? 'Action may affect SLA ownership, approval release, or escalation visibility.' : 'Action remains within standard workspace permissions.',
    permissionLineage: ['Role entitlement', 'Workspace scope', 'Workflow state', 'Sensitivity level', 'Escalation status'],
    governanceTraceability: 'Decision is explainable and attached to the governance event stream.',
  };
};

export const governancePolicies: GovernancePolicy[] = [
  { id: 'gp-1', title: 'Compliance-Sensitive Release Gate', scope: 'Documents + GST', checkpoint: 'Approval chain required before client visibility', enforcement: 'approval-required' },
  { id: 'gp-2', title: 'Escalation Ownership Chain', scope: 'Notices + SLA', checkpoint: 'Every escalation must expose current owner and next reviewer', enforcement: 'restricted' },
  { id: 'gp-3', title: 'AI Recommendation Audit', scope: 'AI operational guidance', checkpoint: 'Operator action must remain attributable and recommendation reason visible', enforcement: 'advisory' },
  { id: 'gp-4', title: 'Governed Collaboration Notes', scope: 'Workflow comments', checkpoint: 'Restricted workflows hide sensitive context from non-authorized participants', enforcement: 'restricted' },
];

