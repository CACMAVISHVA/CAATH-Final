export type WorkflowTriggerType =
  | 'task_overdue'
  | 'gst_deadline'
  | 'approval_pending'
  | 'automation_failure'
  | 'workload_overload';

export type WorkflowRuleActionType =
  | 'auto_assign_recommendation'
  | 'escalation_recommendation'
  | 'create_reminder'
  | 'approval_route_recommendation'
  | 'high_risk_notice_tag_recommendation'
  | 'critical_prioritization_recommendation';

export interface WorkflowTrigger {
  id: string;
  type: WorkflowTriggerType;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  details?: string;
}

export interface WorkflowRuleEvaluation {
  id: string;
  name: string;
  triggered: boolean;
  skippedReason?: string;
  actionType: WorkflowRuleActionType;
  recommendation?: string;
  performedAction?: string;
  reversible: boolean;
}

const toSeverity = (count: number, criticalAt: number, warningAt: number): 'info' | 'warning' | 'critical' => {
  if (count >= criticalAt) return 'critical';
  if (count >= warningAt) return 'warning';
  return 'info';
};

export const automationPolicyEngine = {
  evaluate(input: {
    overdueTasks: number;
    nearDueFilings: number;
    staleApprovals: number;
    recentFailures: number;
    overloadedUsers: number;
    highRiskNotices: number;
  }) {
    const triggers: WorkflowTrigger[] = [
      { id: 'trigger-task-overdue', type: 'task_overdue', severity: toSeverity(input.overdueTasks, 10, 4), summary: `${input.overdueTasks} overdue tasks detected`, details: 'Use reassignment and escalation assistance for aged tasks.' },
      { id: 'trigger-gst-deadline', type: 'gst_deadline', severity: toSeverity(input.nearDueFilings, 12, 5), summary: `${input.nearDueFilings} GST/compliance filings due within 3 days`, details: 'Prepare reminders and assignment checks before due date.' },
      { id: 'trigger-approval-pending', type: 'approval_pending', severity: toSeverity(input.staleApprovals, 8, 3), summary: `${input.staleApprovals} approvals pending beyond 5 days`, details: 'Route approval nudges and owner follow-up recommendations.' },
      { id: 'trigger-automation-failure', type: 'automation_failure', severity: toSeverity(input.recentFailures, 5, 2), summary: `${input.recentFailures} automation failures in recent runs`, details: 'Investigate failing rules and run recovery actions.' },
      { id: 'trigger-workload-overload', type: 'workload_overload', severity: toSeverity(input.overloadedUsers, 4, 1), summary: `${input.overloadedUsers} users overloaded (8+ active tasks)`, details: 'Recommend balancing and reassignment.' },
    ];

    const rules: WorkflowRuleEvaluation[] = [
      { id: 'rule-auto-assign-repetitive', name: 'Auto-assign repetitive categories', triggered: input.overdueTasks > 0, actionType: 'auto_assign_recommendation', recommendation: input.overdueTasks > 0 ? 'Recommend assigning repetitive GST/TDS tasks to available assignees based on workload.' : undefined, skippedReason: input.overdueTasks === 0 ? 'No overdue repetitive tasks found.' : undefined, reversible: true },
      { id: 'rule-auto-escalate-overdue', name: 'Auto-escalate overdue workflows', triggered: input.overdueTasks >= 5, actionType: 'escalation_recommendation', recommendation: input.overdueTasks >= 5 ? 'Escalate top overdue workflows to Admin/SuperAdmin review queue.' : undefined, skippedReason: input.overdueTasks < 5 ? 'Overdue threshold not reached.' : undefined, reversible: true },
      { id: 'rule-auto-reminders', name: 'Auto-create reminders before due dates', triggered: input.nearDueFilings > 0, actionType: 'create_reminder', recommendation: input.nearDueFilings > 0 ? 'Reminder created for nearest due filing. Additional reminders can be reviewed manually.' : undefined, skippedReason: input.nearDueFilings === 0 ? 'No due-date trigger candidates.' : undefined, reversible: true },
      { id: 'rule-approval-route', name: 'Auto-route approvals', triggered: input.staleApprovals > 0, actionType: 'approval_route_recommendation', recommendation: input.staleApprovals > 0 ? 'Route stalled approvals to designated reviewer lane and issue reminder notices.' : undefined, skippedReason: input.staleApprovals === 0 ? 'No stalled approvals.' : undefined, reversible: true },
      { id: 'rule-high-risk-notice-tag', name: 'Auto-tag high-risk notices', triggered: input.highRiskNotices > 0, actionType: 'high_risk_notice_tag_recommendation', recommendation: input.highRiskNotices > 0 ? 'Tag escalated/late notices as high-risk and prioritize response workflow.' : undefined, skippedReason: input.highRiskNotices === 0 ? 'No high-risk notice candidates.' : undefined, reversible: true },
      { id: 'rule-critical-priority', name: 'Auto-prioritize critical workloads', triggered: input.overloadedUsers > 0, actionType: 'critical_prioritization_recommendation', recommendation: input.overloadedUsers > 0 ? 'Prioritize critical tasks and redistribute low-priority work from overloaded assignees.' : undefined, skippedReason: input.overloadedUsers === 0 ? 'No workload overload trigger found.' : undefined, reversible: true },
    ];

    return { triggers, rules };
  },
};
