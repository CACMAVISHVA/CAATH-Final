import { User } from '../../../types';
import { createReminder } from '../../../services/automationService';
import { getAutomationRuns, logEnterpriseActivity, recordAutomationRun, AutomationRun } from '../../../services/observabilityService';
import { requireTenantContext } from '../context/tenantContext';
import { buildWorkflowMetadata } from '../context/workflowMetadata';
import { emitWorkflowEvent } from '../events/workflowEvents';
import { automationPolicyEngine, WorkflowRuleEvaluation, WorkflowTrigger } from '../policies/automationPolicies';
import { workflowAutomationRepository } from '../repositories/WorkflowAutomationRepository';

export interface WorkflowAutomationExecution {
  executedAt: string;
  triggers: WorkflowTrigger[];
  rules: WorkflowRuleEvaluation[];
  recommendations: string[];
  runs: AutomationRun[];
}

const isoInDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export const workflowAutomationOrchestrator = {
  async evaluateWorkflowAutomation(firmId: string, user: User): Promise<WorkflowAutomationExecution> {
    const context = requireTenantContext(user);
    const metadata = buildWorkflowMetadata(context);

    const nowIso = new Date().toISOString();
    const threeDaysAhead = isoInDays(3);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const [inputs, recentRuns] = await Promise.all([
      workflowAutomationRepository.loadWorkflowInputs(firmId),
      getAutomationRuns(firmId, 40),
    ]);

    const overdueTasks = inputs.tasks.filter((t) => t.deadline && t.deadline < nowIso && !['Completed', 'Archived'].includes(t.status || ''));
    const nearDueFilings = inputs.filings.filter((f) => f.due_date && f.due_date >= nowIso && f.due_date <= threeDaysAhead && f.status !== 'Filed');
    const staleApprovals = inputs.approvals.filter((a) => ['PENDING', 'UNDER_REVIEW'].includes((a.status || '').toUpperCase()) && a.updated_at && a.updated_at <= fiveDaysAgo);

    const workloadMap: Record<string, number> = {};
    inputs.tasks.forEach((task) => {
      if (!task.assigned_to || ['Completed', 'Archived'].includes(task.status || '')) return;
      workloadMap[task.assigned_to] = (workloadMap[task.assigned_to] || 0) + 1;
    });

    const overloadedUsers = Object.entries(workloadMap).filter(([, count]) => count >= 8).length;
    const recentFailures = recentRuns.filter((run) => run.status === 'failed').length;
    const highRiskNotices = inputs.notices.filter((n) => ['Escalated', 'Late'].includes(n.status || '')).length;

    const { triggers, rules } = automationPolicyEngine.evaluate({
      overdueTasks: overdueTasks.length,
      nearDueFilings: nearDueFilings.length,
      staleApprovals: staleApprovals.length,
      recentFailures,
      overloadedUsers,
      highRiskNotices,
    });

    let reminderAction = 'Skipped';
    if (nearDueFilings.length > 0) {
      const first = nearDueFilings[0];
      try {
        await createReminder({
          firmId,
          userId: user.id,
          reminderType: 'COMPLIANCE_DUE',
          title: `Automation Reminder: ${first.return_type || 'Compliance'} due soon`,
          message: 'Automation suggested reminder for approaching filing deadline. Validate and proceed.',
          triggerAt: first.due_date || new Date().toISOString(),
          frequency: 'ONCE',
          entityType: 'ComplianceTask',
          entityId: first.id,
        });
        reminderAction = 'Created reminder';
      } catch {
        reminderAction = 'Reminder creation failed';
      }
    }

    const normalizedRules = rules.map((rule) =>
      rule.id === 'rule-auto-reminders' ? { ...rule, performedAction: reminderAction } : rule,
    );

    const recommendations = normalizedRules.filter((rule) => rule.recommendation).map((rule) => rule.recommendation as string);

    const runPayload = {
      triggerCounts: {
        overdueTasks: overdueTasks.length,
        nearDueFilings: nearDueFilings.length,
        staleApprovals: staleApprovals.length,
        recentFailures,
        overloadedUsers,
      },
      triggeredRules: normalizedRules.filter((rule) => rule.triggered).map((rule) => rule.id),
      metadata,
    };

    await recordAutomationRun({
      firm_id: firmId,
      automation_key: 'workflow-rule-evaluator',
      status: 'success',
      started_at: nowIso,
      finished_at: new Date().toISOString(),
      run_payload: runPayload,
      result: { recommendations, rules: normalizedRules },
    });

    await logEnterpriseActivity({
      firm_id: firmId,
      event_type: 'workflow_automation_run',
      event_subtype: 'rule_evaluator',
      actor_id: user.id,
      actor_name: user.name,
      actor_role: user.role,
      severity: 'notice',
      details: runPayload,
    });

    if (overdueTasks.length > 0) await emitWorkflowEvent('TASK_OVERDUE', { taskCount: overdueTasks.length, tenantId: firmId }, firmId, user.id);
    if (nearDueFilings.length > 0) await emitWorkflowEvent('GST_DEADLINE_APPROACHING', { filingCount: nearDueFilings.length, tenantId: firmId }, firmId, user.id);
    if (highRiskNotices > 0) await emitWorkflowEvent('NOTICE_ESCALATED', { noticeCount: highRiskNotices, tenantId: firmId }, firmId, user.id);

    const runs = await getAutomationRuns(firmId, 25);

    return {
      executedAt: new Date().toISOString(),
      triggers,
      rules: normalizedRules,
      recommendations,
      runs,
    };
  },
};
