import { supabase } from '../lib/supabase';
import { getRevenueIntelligenceSnapshot } from './revenueIntelligenceService';
import { getDocumentIntelligenceDashboardSummary } from './documents/documentIntelligenceDashboardService';
import { getTelemetryTrendSummary, recordOperationalTelemetry, TelemetryTrendSummary } from './operationalTelemetryPipelineService';

export interface RiskSignal {
  key: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  threshold: number;
  summary: string;
  recommendation: string;
}

export interface ForecastSignal {
  metric: string;
  direction: 'up' | 'down' | 'flat';
  currentValue: number;
  projected7d: number;
}

export interface StaffLoadRisk {
  userId: string;
  activeAssignments: number;
  reassignments30d: number;
  stalledAssignments: number;
  riskBand: 'low' | 'medium' | 'high';
}

export interface ClientRiskIndicator {
  clientId: string;
  clientName: string;
  overdueTasks: number;
  activeNotices: number;
  overdueNotices: number;
  receivablePressure: number;
  documentBacklog: number;
  healthScore: number;
}

export interface PredictiveOperationalSnapshot {
  generatedAt: string;
  operationalHealthScore: number;
  governanceRiskScore: number;
  billingPressureScore: number;
  workloadImbalanceScore: number;
  escalationHeatmap: Array<{ date: string; count: number }>;
  reliabilityTrendSummary: {
    workflowThroughput: TelemetryTrendSummary;
    billingCompletionRate: TelemetryTrendSummary;
    overdueTaskTrend: TelemetryTrendSummary;
    noticeVolumeTrend: TelemetryTrendSummary;
    payrollGovernanceTrend: TelemetryTrendSummary;
    workloadDistributionTrend: TelemetryTrendSummary;
  };
  riskSignals: RiskSignal[];
  forecastSignals: ForecastSignal[];
  staffLoadRisks: StaffLoadRisk[];
  clientRiskIndicators: ClientRiskIndicator[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const sumTrend = (trend: TelemetryTrendSummary) => trend.points.reduce((acc, point) => acc + point.count, 0);

const trendDirection = (trend: TelemetryTrendSummary): 'up' | 'down' | 'flat' => {
  if (trend.points.length < 4) return 'flat';
  const mid = Math.floor(trend.points.length / 2);
  const left = trend.points.slice(0, mid).reduce((s, p) => s + p.count, 0);
  const right = trend.points.slice(mid).reduce((s, p) => s + p.count, 0);
  if (right > left * 1.15) return 'up';
  if (right < left * 0.85) return 'down';
  return 'flat';
};

const severityByValue = (value: number, medium: number, high: number, critical: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (value >= critical) return 'critical';
  if (value >= high) return 'high';
  if (value >= medium) return 'medium';
  return 'low';
};

export const getPredictiveOperationalSnapshot = async (firmId: string): Promise<PredictiveOperationalSnapshot> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    tasksRes,
    noticesRes,
    approvalsRes,
    payrollRes,
    reassignRes,
    clientsRes,
    revenue,
    documentSummary,
    workflowThroughput,
    billingCompletionRate,
    escalationTrend,
    reassignmentTrend,
    approvalTrend,
    payrollGovernanceTrend,
  ] = await Promise.all([
    supabase.from('tasks').select('id, status, assigned_to, client_id, deadline, updated_at').eq('firm_id', firmId),
    supabase.from('notices').select('id, client_id, status, deadline, created_at').eq('firm_id', firmId),
    supabase.from('approval_tasks').select('id, status, assigned_to, updated_at').eq('firm_id', firmId),
    supabase.from('payroll_runs').select('id, payout_status, created_at, approved_at').eq('firm_id', firmId),
    supabase.from('task_reassignments').select('id, task_id, created_at, reassigned_by').eq('firm_id', firmId).gte('created_at', thirtyDaysAgo),
    supabase.from('clients').select('id, name').eq('firm_id', firmId),
    getRevenueIntelligenceSnapshot(firmId),
    getDocumentIntelligenceDashboardSummary(firmId),
    getTelemetryTrendSummary(firmId, 'workflow_transition', 30),
    getTelemetryTrendSummary(firmId, 'revenue_lifecycle', 30),
    getTelemetryTrendSummary(firmId, 'workflow_escalation', 30),
    getTelemetryTrendSummary(firmId, 'reassignment_frequency', 30),
    getTelemetryTrendSummary(firmId, 'approval_throughput', 30),
    getTelemetryTrendSummary(firmId, 'payroll_governance', 30),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (noticesRes.error) throw noticesRes.error;
  if (approvalsRes.error) throw approvalsRes.error;
  if (payrollRes.error) throw payrollRes.error;
  if (reassignRes.error) throw reassignRes.error;
  if (clientsRes.error) throw clientsRes.error;

  const tasks = tasksRes.data || [];
  const notices = noticesRes.data || [];
  const approvals = approvalsRes.data || [];
  const payrollRuns = payrollRes.data || [];
  const reassignments = reassignRes.data || [];
  const clients = clientsRes.data || [];

  const overdueTasks = tasks.filter((task) => task.deadline && new Date(task.deadline) < now && !['Completed', 'Archived'].includes(task.status)).length;
  const escalatedTasks = tasks.filter((task) => task.status === 'Escalated').length;
  const reassignmentInstability = Object.values(
    reassignments.reduce((acc: Record<string, number>, item) => {
      acc[item.task_id] = (acc[item.task_id] || 0) + 1;
      return acc;
    }, {})
  ).filter((count) => count >= 3).length;
  const approvalBacklog = approvals.filter((item) => ['PENDING', 'UNDER_REVIEW', 'REWORK'].includes(item.status)).length;
  const unresolvedNotices = notices.filter((item) => !['Closed', 'Filed', 'Archived'].includes(item.status)).length;
  const overdueNotices = notices.filter((item) => item.deadline && new Date(item.deadline) < now && !['Closed', 'Filed', 'Archived'].includes(item.status)).length;
  const receivablePressure = revenue.kpis.overdueCollections + revenue.kpis.receivablesPending;

  const staffWorkloads: Record<string, number> = {};
  const stalledByUser: Record<string, number> = {};
  tasks.forEach((task) => {
    if (!task.assigned_to || ['Completed', 'Archived'].includes(task.status)) return;
    staffWorkloads[task.assigned_to] = (staffWorkloads[task.assigned_to] || 0) + 1;
    if (task.updated_at && task.updated_at <= sevenDaysAgo) {
      stalledByUser[task.assigned_to] = (stalledByUser[task.assigned_to] || 0) + 1;
    }
  });
  const reassignmentByUser: Record<string, number> = {};
  reassignments.forEach((item) => {
    if (!item.reassigned_by) return;
    reassignmentByUser[item.reassigned_by] = (reassignmentByUser[item.reassigned_by] || 0) + 1;
  });

  const staffLoadRisks: StaffLoadRisk[] = Object.entries(staffWorkloads)
    .map(([userId, activeAssignments]) => {
      const reassignments30d = reassignmentByUser[userId] || 0;
      const stalledAssignments = stalledByUser[userId] || 0;
      const riskBand: 'low' | 'medium' | 'high' =
        activeAssignments >= 10 || stalledAssignments >= 4 ? 'high' :
        activeAssignments >= 7 || reassignments30d >= 5 ? 'medium' : 'low';
      return { userId, activeAssignments, reassignments30d, stalledAssignments, riskBand };
    })
    .sort((a, b) => b.activeAssignments - a.activeAssignments)
    .slice(0, 12);

  const noticeByClient: Record<string, { active: number; overdue: number }> = {};
  notices.forEach((notice) => {
    if (!notice.client_id) return;
    if (!noticeByClient[notice.client_id]) noticeByClient[notice.client_id] = { active: 0, overdue: 0 };
    if (!['Closed', 'Filed', 'Archived'].includes(notice.status)) {
      noticeByClient[notice.client_id].active += 1;
      if (notice.deadline && new Date(notice.deadline) < now) noticeByClient[notice.client_id].overdue += 1;
    }
  });
  const overdueTasksByClient: Record<string, number> = {};
  tasks.forEach((task) => {
    if (!task.client_id) return;
    if (task.deadline && new Date(task.deadline) < now && !['Completed', 'Archived'].includes(task.status)) {
      overdueTasksByClient[task.client_id] = (overdueTasksByClient[task.client_id] || 0) + 1;
    }
  });
  const revenueByClient = new Map(revenue.breakdown.byClient.map((row) => [row.clientId, row.amount]));

  const clientRiskIndicators: ClientRiskIndicator[] = clients.map((client) => {
    const noticeSignals = noticeByClient[client.id] || { active: 0, overdue: 0 };
    const overdueClientTasks = overdueTasksByClient[client.id] || 0;
    const clientRevenue = revenueByClient.get(client.id) || 0;
    const clientReceivablePressure = clientRevenue > 0 ? Math.round((revenue.kpis.overdueCollections / clientRevenue) * 100) : 0;
    const documentBacklog = Math.round(documentSummary.processingBacklog / Math.max(1, clients.length));
    const healthScore = clamp(
      100 -
      overdueClientTasks * 12 -
      noticeSignals.overdue * 14 -
      noticeSignals.active * 4 -
      Math.min(clientReceivablePressure, 40) -
      documentBacklog * 3
    );
    return {
      clientId: client.id,
      clientName: client.name,
      overdueTasks: overdueClientTasks,
      activeNotices: noticeSignals.active,
      overdueNotices: noticeSignals.overdue,
      receivablePressure: clientReceivablePressure,
      documentBacklog,
      healthScore,
    };
  }).sort((a, b) => a.healthScore - b.healthScore).slice(0, 15);

  const riskSignals: RiskSignal[] = [
    {
      key: 'overdue_workflow_clusters',
      severity: severityByValue(overdueTasks, 6, 12, 20),
      value: overdueTasks,
      threshold: 12,
      summary: `${overdueTasks} overdue workflow tasks detected.`,
      recommendation: 'Prioritize aged workflows and re-balance ownership.',
    },
    {
      key: 'escalation_pressure_growth',
      severity: severityByValue(sumTrend(escalationTrend), 8, 16, 28),
      value: sumTrend(escalationTrend),
      threshold: 16,
      summary: `${sumTrend(escalationTrend)} escalation signals in the last 30 days.`,
      recommendation: 'Route escalations into focused governance triage.',
    },
    {
      key: 'reassignment_instability',
      severity: severityByValue(reassignmentInstability, 2, 5, 8),
      value: reassignmentInstability,
      threshold: 5,
      summary: `${reassignmentInstability} unstable reassignment chains identified.`,
      recommendation: 'Stabilize assignment criteria and enforce ownership continuity.',
    },
    {
      key: 'approval_bottlenecks',
      severity: severityByValue(approvalBacklog, 8, 14, 24),
      value: approvalBacklog,
      threshold: 14,
      summary: `${approvalBacklog} approvals are unresolved.`,
      recommendation: 'Introduce approval burst windows and reviewer lane balancing.',
    },
    {
      key: 'unresolved_notice_accumulation',
      severity: severityByValue(unresolvedNotices, 6, 12, 20),
      value: unresolvedNotices,
      threshold: 12,
      summary: `${unresolvedNotices} unresolved notices with ${overdueNotices} overdue.`,
      recommendation: 'Escalate unresolved notices and attach SLA ownership.',
    },
    {
      key: 'billing_pressure_buildup',
      severity: severityByValue(receivablePressure, 100000, 300000, 600000),
      value: receivablePressure,
      threshold: 300000,
      summary: `Receivable pressure at ${receivablePressure}.`,
      recommendation: 'Prioritize overdue collections and close unbilled workflow clusters.',
    },
  ];

  const forecastSignals: ForecastSignal[] = [
    {
      metric: 'workflow_throughput',
      direction: trendDirection(workflowThroughput),
      currentValue: workflowThroughput.total,
      projected7d: Math.round((workflowThroughput.total / 30) * 7),
    },
    {
      metric: 'billing_completion_rate',
      direction: trendDirection(billingCompletionRate),
      currentValue: billingCompletionRate.total,
      projected7d: Math.round((billingCompletionRate.total / 30) * 7),
    },
    {
      metric: 'approval_throughput',
      direction: trendDirection(approvalTrend),
      currentValue: approvalTrend.total,
      projected7d: Math.round((approvalTrend.total / 30) * 7),
    },
    {
      metric: 'payroll_governance_flow',
      direction: trendDirection(payrollGovernanceTrend),
      currentValue: payrollGovernanceTrend.total,
      projected7d: Math.round((payrollGovernanceTrend.total / 30) * 7),
    },
  ];

  const workloadImbalanceScore = clamp(
    staffLoadRisks.filter((item) => item.riskBand === 'high').length * 18 +
    staffLoadRisks.filter((item) => item.riskBand === 'medium').length * 8
  );
  const billingPressureScore = clamp(
    revenue.kpis.completedTasksAwaitingBilling * 6 +
    Math.round(revenue.kpis.overdueCollections / 50000) * 8 +
    Math.round(revenue.kpis.receivablesPending / 80000) * 5
  );
  const governanceRiskScore = clamp(
    riskSignals.reduce((sum, signal) =>
      sum + (signal.severity === 'critical' ? 22 : signal.severity === 'high' ? 14 : signal.severity === 'medium' ? 7 : 2), 0)
  );
  const operationalHealthScore = clamp(100 - (workloadImbalanceScore * 0.33 + billingPressureScore * 0.27 + governanceRiskScore * 0.40));

  try {
    await recordOperationalTelemetry({
      firmId,
      metric: 'event_propagation',
      eventName: 'predictive_operational_snapshot_generated',
      severity: governanceRiskScore >= 75 ? 'warning' : 'info',
      payload: {
        operationalHealthScore,
        governanceRiskScore,
        billingPressureScore,
        topRiskSignals: riskSignals.slice(0, 3).map((signal) => ({ key: signal.key, severity: signal.severity, value: signal.value })),
      },
    });
  } catch {
    // keep predictive reads non-blocking
  }

  return {
    generatedAt: new Date().toISOString(),
    operationalHealthScore,
    governanceRiskScore,
    billingPressureScore,
    workloadImbalanceScore,
    escalationHeatmap: escalationTrend.points,
    reliabilityTrendSummary: {
      workflowThroughput,
      billingCompletionRate,
      overdueTaskTrend: escalationTrend,
      noticeVolumeTrend: workflowThroughput,
      payrollGovernanceTrend,
      workloadDistributionTrend: reassignmentTrend,
    },
    riskSignals,
    forecastSignals,
    staffLoadRisks,
    clientRiskIndicators,
  };
};
