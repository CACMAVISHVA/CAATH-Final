import { supabase } from '../lib/supabase';
import { getAutomationRuns } from './observabilityService';
import { getWorkflowLifecycleIntegritySummary, WorkflowIntegritySummary } from './workflowLifecycleIntegrityService';
import { getTelemetryTrendSummary, TelemetryTrendSummary } from './operationalTelemetryPipelineService';
import { DocumentIntelligenceDashboardSummary, getDocumentIntelligenceDashboardSummary } from './documents/documentIntelligenceDashboardService';
import { getPredictiveOperationalSnapshot, PredictiveOperationalSnapshot } from './predictiveOperationalIntelligenceService';

export type InsightSeverity = 'critical' | 'warning' | 'info';
export type OperationalInsightCategory = 'workload' | 'automation' | 'approval' | 'notice' | 'document' | 'practice';

export interface OperationalInsight {
  id: string;
  title: string;
  category: OperationalInsightCategory;
  severity: InsightSeverity;
  summary: string;
  recommendation: string;
}

export interface OperationalHealthSummary {
  score: number;
  workflowHealthScore: number;
  operationalIntegrityScore: number;
  lifecycleReliabilityScore: number;
  workloadRisk: number;
  automationReliability: number;
  approvalPressure: number;
  noticeExposure: number;
  automationTotal: number;
  automationFailures: number;
  automationSkipped: number;
  integrity: WorkflowIntegritySummary;
  reliabilityTrends: {
    escalationPressure: TelemetryTrendSummary;
    reassignmentInstability: TelemetryTrendSummary;
    approvalBottleneck: TelemetryTrendSummary;
    workflowTransitions: TelemetryTrendSummary;
  };
  documentIntelligence: DocumentIntelligenceDashboardSummary;
  predictive: PredictiveOperationalSnapshot;
  topInsights: OperationalInsight[];
}

const createInsight = (
  title: string,
  category: OperationalInsightCategory,
  severity: InsightSeverity,
  summary: string,
  recommendation: string
): OperationalInsight => ({
  id: `${category}-${title.replace(/\s+/g, '-').toLowerCase()}`,
  title,
  category,
  severity,
  summary,
  recommendation,
});

const normalizeScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const getOperationalHealthSummary = async (firmId: string): Promise<OperationalHealthSummary> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const [taskResult, approvalResult, noticeResult, integrity, escalationPressure, reassignmentInstability, approvalBottleneck, workflowTransitions, documentIntelligence, predictive] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, status, assigned_to, deadline, client_id, updated_at, created_at', { count: 'exact' })
      .eq('firm_id', firmId),
    supabase
      .from('approval_tasks')
      .select('id, status, updated_at', { count: 'exact' })
      .eq('firm_id', firmId),
    supabase
      .from('notices')
      .select('id, status, created_at', { count: 'exact' })
      .eq('firm_id', firmId),
    getWorkflowLifecycleIntegritySummary(firmId),
    getTelemetryTrendSummary(firmId, 'workflow_escalation', 21),
    getTelemetryTrendSummary(firmId, 'reassignment_frequency', 21),
    getTelemetryTrendSummary(firmId, 'approval_throughput', 21),
    getTelemetryTrendSummary(firmId, 'workflow_transition', 21),
    getDocumentIntelligenceDashboardSummary(firmId),
    getPredictiveOperationalSnapshot(firmId),
  ]);

  if (taskResult.error) throw taskResult.error;
  if (approvalResult.error) throw approvalResult.error;
  if (noticeResult.error) throw noticeResult.error;

  const tasks = (taskResult.data || []) as Array<{
    id: string;
    status: string;
    assigned_to: string | null;
    deadline: string | null;
    client_id: string | null;
    updated_at: string | null;
    created_at: string | null;
  }>;
  const approvals = (approvalResult.data || []) as Array<{ id: string; status: string; updated_at: string | null }>;
  const notices = (noticeResult.data || []) as Array<{ id: string; status: string; created_at: string | null }>;

  const overdueTasks = tasks.filter(
    (task) => task.deadline && new Date(task.deadline) < now && task.status !== 'Completed'
  ).length;

  const escalationRisk = tasks.filter(
    (task) => task.status === 'Escalated' || (task.deadline && new Date(task.deadline) < now && !['Completed', 'Archived'].includes(task.status))
  ).length;

  const pendingWorkloads = tasks.filter((task) => !['Completed', 'Archived'].includes(task.status)).length;

  const userWorkloads: Record<string, number> = {};
  tasks.forEach((task) => {
    if (!task.assigned_to || ['Completed', 'Archived'].includes(task.status)) return;
    userWorkloads[task.assigned_to] = (userWorkloads[task.assigned_to] || 0) + 1;
  });

  const overloadedStaffCount = Object.values(userWorkloads).filter((count) => count >= 8).length;
  const topLoaders = Object.entries(userWorkloads)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId, count]) => ({ userId, count }));

  const approvalBacklog = approvals.filter((item) => ['PENDING', 'UNDER_REVIEW'].includes(item.status)).length;
  const stalledApprovals = approvals.filter(
    (item) => ['PENDING', 'UNDER_REVIEW'].includes(item.status) && item.updated_at && item.updated_at <= sevenDaysAgo
  ).length;

  const noticeBacklog = notices.filter(
    (notice) => ['Received', 'Assigned'].includes(notice.status) && notice.created_at && notice.created_at <= fiveDaysAgo
  ).length;

  const automationRuns = await getAutomationRuns(firmId, 50);
  const automationTotal = automationRuns.length;
  const automationFailures = automationRuns.filter((run) => run.status === 'failed').length;
  const automationSkipped = automationRuns.filter((run) => run.status === 'skipped').length;
  const automationFailureRate = automationTotal === 0 ? 0 : automationFailures / automationTotal;
  const automationReliability = normalizeScore(100 - automationFailureRate * 120 - (automationSkipped / Math.max(automationTotal, 1)) * 20);

  const workloadRisk = normalizeScore(
    overdueTasks * 4 + escalationRisk * 3 + overloadedStaffCount * 8 + pendingWorkloads * 1.25
  );

  const approvalPressure = normalizeScore(approvalBacklog * 3 + stalledApprovals * 6);
  const noticeExposure = normalizeScore(noticeBacklog * 3 + overdueTasks * 1.5);

  const score = normalizeScore(
    100
      - workloadRisk * 0.22
      - approvalPressure * 0.14
      - noticeExposure * 0.12
      + automationReliability * 0.2
      + integrity.workflowHealthScore * 0.16
      + integrity.lifecycleReliabilityScore * 0.16
  );

  const insights: OperationalInsight[] = [];

  if (overdueTasks > 8) {
    insights.push(createInsight(
      'Overdue task pressure',
      'workload',
      'critical',
      `${overdueTasks} open tasks are past their deadline and driving practice-wide risk.`,
      'Rebalance assignments, resolve urgent deadlines, and re-prioritize overdue work.'
    ));
  } else if (overdueTasks > 3) {
    insights.push(createInsight(
      'Rising overdue workload',
      'workload',
      'warning',
      `${overdueTasks} tasks are overdue this week.`,
      'Focus on the oldest pending items before they escalate further.'
    ));
  }

  if (overloadedStaffCount > 0) {
    const people = topLoaders.map((loader) => `${loader.userId} (${loader.count})`).join(', ');
    insights.push(createInsight(
      'Staff capacity constraint',
      'workload',
      'warning',
      `There are ${overloadedStaffCount} team members with eight or more active assignments.${people ? ` ${people}` : ''}`,
      'Consider reassigning or pausing non-critical work until workload rebalances.'
    ));
  }

  if (approvalBacklog >= 8 || stalledApprovals >= 4) {
    insights.push(createInsight(
      'Approval bottleneck detected',
      'approval',
      stalledApprovals >= 4 ? 'critical' : 'warning',
      `There are ${approvalBacklog} approvals pending and ${stalledApprovals} approvals stalled for 7+ days.`,
      'Escalate approvals through your senior reviewers or automate reminder notifications.'
    ));
  }

  if (automationFailureRate > 0.12) {
    insights.push(createInsight(
      'Automation reliability down',
      'automation',
      'critical',
      `Automations failed on ${Math.round(automationFailureRate * 100)}% of recent runs.`,
      'Investigate failing automation flows and retry jobs to restore reliability.'
    ));
  } else if (automationFailureRate > 0.06) {
    insights.push(createInsight(
      'Automation warnings present',
      'automation',
      'warning',
      `Some automation runs are failing; review the ${automationFailures} recent errors.`,
      'Review automation logs and patch failing workflows before escalation grows.'
    ));
  }

  if (noticeBacklog > 6) {
    insights.push(createInsight(
      'Notice backlog exposure',
      'notice',
      'warning',
      `There are ${noticeBacklog} older open notices that should be reviewed.`,
      'Clear aged notices, assign ownership, and validate client priorities.'
    ));
  }

  if (documentIntelligence.processingBacklog > 0 || documentIntelligence.extractionFailures > 0) {
    insights.push(createInsight(
      'Document intelligence backlog',
      'document',
      documentIntelligence.extractionFailures > 0 ? 'warning' : 'info',
      `${documentIntelligence.processingBacklog} documents are pending orchestration and ${documentIntelligence.extractionFailures} extraction failures were detected.`,
      'Review failed extractions and link pending compliance documents to workflows.'
    ));
  }

  if (integrity.counts.invalidTransitions > 0 || integrity.counts.noticeTaskSyncFailures > 0) {
    insights.push(createInsight(
      'Lifecycle integrity violations',
      'practice',
      integrity.counts.invalidTransitions > 0 ? 'critical' : 'warning',
      `${integrity.counts.invalidTransitions} invalid transitions and ${integrity.counts.noticeTaskSyncFailures} notice/task sync failures detected.`,
      'Review workflow integrity report and apply governance recovery actions.'
    ));
  }

  if (integrity.counts.overdueEscalationChains > 0 || integrity.counts.reassignmentInstability > 0) {
    insights.push(createInsight(
      'Execution continuity risk',
      'workload',
      'warning',
      `${integrity.counts.overdueEscalationChains} overdue escalation chains and ${integrity.counts.reassignmentInstability} unstable reassignment chains found.`,
      'Stabilize ownership and prioritize escalations to restore workflow continuity.'
    ));
  }

  if (predictive.governanceRiskScore >= 70) {
    insights.push(createInsight(
      'Predictive governance risk',
      'practice',
      'critical',
      `Governance risk score is ${predictive.governanceRiskScore} with rising operational pressure indicators.`,
      'Trigger proactive governance review and prioritize high-severity risk signals.'
    ));
  }

  if (predictive.billingPressureScore >= 60) {
    insights.push(createInsight(
      'Revenue pressure rising',
      'practice',
      'warning',
      `Billing pressure score reached ${predictive.billingPressureScore}; receivable and unbilled workflows are accumulating.`,
      'Prioritize completed-task billing and overdue collection actions this cycle.'
    ));
  }

  if (insights.length === 0) {
    insights.push(createInsight(
      'Operational pulse stable',
      'practice',
      'info',
      'Current operational metrics are within expected thresholds.',
      'Keep monitoring the risk score and proactive workflow handoffs.'
    ));
  }

  return {
    score,
    workflowHealthScore: integrity.workflowHealthScore,
    operationalIntegrityScore: integrity.operationalIntegrityScore,
    lifecycleReliabilityScore: integrity.lifecycleReliabilityScore,
    workloadRisk,
    automationReliability,
    approvalPressure,
    noticeExposure,
    automationTotal,
    automationFailures,
    automationSkipped,
    integrity,
    reliabilityTrends: {
      escalationPressure,
      reassignmentInstability,
      approvalBottleneck,
      workflowTransitions,
    },
    documentIntelligence,
    predictive,
    topInsights: insights.slice(0, 4),
  };
};
