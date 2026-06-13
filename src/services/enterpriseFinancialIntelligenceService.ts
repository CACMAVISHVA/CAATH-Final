import { supabase } from '../lib/supabase';
import { User } from '../types';
import { getRevenueIntelligenceSnapshot } from './revenueIntelligenceService';
import { recordOperationalTelemetry } from './operationalTelemetryPipelineService';

export interface FinancialRiskIndicator {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  recommendation: string;
}

export interface EnterpriseFinancialIntelligenceSnapshot {
  generatedAt: string;
  pnl: {
    accrualRevenue: number;
    realizedRevenue: number;
    operationalExpenses: number;
    payrollCostRecognized: number;
    payrollObligations: number;
    netOperatingProfit: number;
    realizationEfficiency: number;
    profitabilityScore: number;
  };
  balanceSheet: {
    receivablesPending: number;
    overdueCollections: number;
    receivableAging: {
      current: number;
      d30: number;
      d60: number;
      d90Plus: number;
    };
    payrollObligations: number;
    operationalLiabilities: number;
    liquidityPressureScore: number;
    complianceExposureScore: number;
  };
  cashFlow: {
    monthInflow: number;
    monthOutflow: number;
    netFlow: number;
  };
  profitability: {
    byClient: Array<{ clientId: string; clientName: string; revenue: number; allocatedCost: number; netProfit: number; margin: number }>;
    byServiceLine: Array<{ service: string; revenue: number; allocatedCost: number; netProfit: number; margin: number }>;
  };
  workflowFinancialContinuity: {
    completedTasksAwaitingInvoice: number;
    unresolvedNoticeCount: number;
    unresolvedNoticeExposureScore: number;
    overdueApprovalBillingDelay: number;
    bottleneckProfitabilityPressure: number;
  };
  financialRisks: FinancialRiskIndicator[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const toSeverity = (score: number): FinancialRiskIndicator['severity'] => {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const getEnterpriseFinancialIntelligenceSnapshot = async (
  firmId: string,
  user: User
): Promise<EnterpriseFinancialIntelligenceSnapshot> => {
  if (user.role !== 'SuperAdmin') {
    throw new Error('Enterprise financial intelligence is restricted to SuperAdmin.');
  }

  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [revenue, invoicesRes, clientsRes, tasksRes, noticesRes, approvalsRes, payrollRes, expensesRes] = await Promise.all([
    getRevenueIntelligenceSnapshot(firmId),
    supabase.from('invoices').select('id,client_id,billing_category,total,paid_amount,pending_amount,due_date,status,issue_date').eq('firm_id', firmId).neq('status', 'Cancelled'),
    supabase.from('clients').select('id,name').eq('firm_id', firmId),
    supabase.from('tasks').select('id,status,client_id').eq('firm_id', firmId),
    supabase.from('notices').select('id,status,client_id,deadline').eq('firm_id', firmId),
    supabase.from('approval_tasks').select('id,status,updated_at,module').eq('firm_id', firmId),
    supabase.from('payroll_runs').select('id,net_amount,payout_status,created_at').eq('firm_id', firmId),
    supabase.from('expenses').select('id,total,status,created_at').eq('firm_id', firmId),
  ]);

  if (invoicesRes.error) throw invoicesRes.error;
  if (clientsRes.error) throw clientsRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (noticesRes.error) throw noticesRes.error;
  if (approvalsRes.error) throw approvalsRes.error;
  if (payrollRes.error) throw payrollRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const invoices = invoicesRes.data || [];
  const clients = clientsRes.data || [];
  const tasks = tasksRes.data || [];
  const notices = noticesRes.data || [];
  const approvals = approvalsRes.data || [];
  const payrollRuns = payrollRes.data || [];
  const expenses = expensesRes.data || [];

  const accrualRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const realizedRevenue = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

  const paidExpenses = expenses
    .filter((exp) => (exp.status || '').toLowerCase() === 'paid')
    .reduce((sum, exp) => sum + (exp.total || 0), 0);

  const paidPayroll = payrollRuns
    .filter((run) => run.payout_status === 'Paid')
    .reduce((sum, run) => sum + (run.net_amount || 0), 0);

  const payrollObligations = payrollRuns
    .filter((run) => ['Draft', 'Pending Approval', 'Approved'].includes(run.payout_status))
    .reduce((sum, run) => sum + (run.net_amount || 0), 0);

  const operationalExpenses = paidExpenses + paidPayroll;
  const netOperatingProfit = realizedRevenue - operationalExpenses;
  const realizationEfficiency = accrualRevenue > 0 ? Math.round((realizedRevenue / accrualRevenue) * 100) : 0;

  const receivableAging = invoices.reduce(
    (acc, inv) => {
      const pending = inv.pending_amount || 0;
      if (pending <= 0) return acc;
      if (!inv.due_date) {
        acc.current += pending;
        return acc;
      }
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) acc.current += pending;
      else if (daysOverdue <= 30) acc.d30 += pending;
      else if (daysOverdue <= 60) acc.d60 += pending;
      else acc.d90Plus += pending;
      return acc;
    },
    { current: 0, d30: 0, d60: 0, d90Plus: 0 }
  );

  const overdueApprovalBillingDelay = approvals.filter(
    (approval) => ['PENDING', 'UNDER_REVIEW'].includes(approval.status) && approval.updated_at && approval.updated_at <= sevenDaysAgoIso
  ).length;

  const unresolvedNotices = notices.filter((notice) => !['Filed', 'Closed', 'Archived'].includes(notice.status || ''));
  const unresolvedNoticeExposureScore = clamp(
    unresolvedNotices.filter((n) => n.deadline && new Date(n.deadline) < now).length * 12 +
    unresolvedNotices.length * 3
  );

  const completedTasksAwaitingInvoice = revenue.kpis.completedTasksAwaitingBilling;
  const bottleneckProfitabilityPressure = clamp(
    completedTasksAwaitingInvoice * 7 +
    overdueApprovalBillingDelay * 8 +
    Math.round(revenue.kpis.overdueCollections / 50000) * 9
  );

  const liquidityPressureScore = clamp(
    Math.round(revenue.kpis.overdueCollections / 50000) * 15 +
    Math.round(payrollObligations / 100000) * 10 +
    overdueApprovalBillingDelay * 4
  );
  const complianceExposureScore = clamp(unresolvedNoticeExposureScore * 0.65 + overdueApprovalBillingDelay * 4);
  const profitabilityScore = clamp(
    realizationEfficiency * 0.4 +
    Math.max(0, 100 - liquidityPressureScore) * 0.2 +
    Math.max(0, 100 - bottleneckProfitabilityPressure) * 0.2 +
    Math.max(0, 100 - complianceExposureScore) * 0.2
  );

  const clientNameMap = new Map(clients.map((client) => [client.id, client.name]));
  const clientRevenueMap = new Map<string, number>();
  const serviceRevenueMap = new Map<string, number>();
  invoices.forEach((inv) => {
    if (inv.client_id) {
      clientRevenueMap.set(inv.client_id, (clientRevenueMap.get(inv.client_id) || 0) + (inv.total || 0));
    }
    const service = inv.billing_category || 'Other';
    serviceRevenueMap.set(service, (serviceRevenueMap.get(service) || 0) + (inv.total || 0));
  });

  const costBase = operationalExpenses + payrollObligations * 0.5;
  const byClient = Array.from(clientRevenueMap.entries())
    .map(([clientId, revenueAmount]) => {
      const share = accrualRevenue > 0 ? revenueAmount / accrualRevenue : 0;
      const allocatedCost = Math.round(costBase * share);
      const netProfit = Math.round(revenueAmount - allocatedCost);
      const margin = revenueAmount > 0 ? Math.round((netProfit / revenueAmount) * 100) : 0;
      return { clientId, clientName: clientNameMap.get(clientId) || 'Unknown Client', revenue: revenueAmount, allocatedCost, netProfit, margin };
    })
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 8);

  const byServiceLine = Array.from(serviceRevenueMap.entries())
    .map(([service, revenueAmount]) => {
      const share = accrualRevenue > 0 ? revenueAmount / accrualRevenue : 0;
      const allocatedCost = Math.round(costBase * share);
      const netProfit = Math.round(revenueAmount - allocatedCost);
      const margin = revenueAmount > 0 ? Math.round((netProfit / revenueAmount) * 100) : 0;
      return { service, revenue: revenueAmount, allocatedCost, netProfit, margin };
    })
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 8);

  const monthInflow = invoices
    .filter((inv) => inv.issue_date && inv.issue_date >= monthStart)
    .reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const monthOutflow =
    expenses
      .filter((exp) => exp.created_at && exp.created_at >= monthStart && (exp.status || '').toLowerCase() === 'paid')
      .reduce((sum, exp) => sum + (exp.total || 0), 0) +
    payrollRuns
      .filter((run) => run.created_at && run.created_at >= monthStart && run.payout_status === 'Paid')
      .reduce((sum, run) => sum + (run.net_amount || 0), 0);

  const financialRisks: FinancialRiskIndicator[] = [
    {
      id: 'fin-liquidity',
      title: 'Liquidity pressure',
      severity: toSeverity(liquidityPressureScore),
      summary: `Overdue receivables and payroll obligations are pressuring liquidity at score ${liquidityPressureScore}.`,
      recommendation: 'Prioritize overdue collection and stage payroll approvals with receivable recovery plans.',
    },
    {
      id: 'fin-billing-leakage',
      title: 'Billing leakage risk',
      severity: toSeverity(bottleneckProfitabilityPressure),
      summary: `${completedTasksAwaitingInvoice} completed tasks are awaiting invoices with approval delay ${overdueApprovalBillingDelay}.`,
      recommendation: 'Clear completed-task invoice queue and resolve stale approvals impacting billing throughput.',
    },
    {
      id: 'fin-compliance-exposure',
      title: 'Compliance-linked financial exposure',
      severity: toSeverity(complianceExposureScore),
      summary: `${unresolvedNotices.length} unresolved notices may create realization delay and collection drag.`,
      recommendation: 'Prioritize notice closure for accounts with high overdue receivables.',
    },
  ];

  try {
    await recordOperationalTelemetry({
      firmId,
      metric: 'revenue_lifecycle',
      eventName: 'enterprise_financial_intelligence_snapshot_generated',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      severity: liquidityPressureScore >= 70 ? 'warning' : 'info',
      payload: {
        profitabilityScore,
        liquidityPressureScore,
        complianceExposureScore,
        completedTasksAwaitingInvoice,
        overdueApprovalBillingDelay,
      },
    });
  } catch {
    // keep runtime stable
  }

  return {
    generatedAt: new Date().toISOString(),
    pnl: {
      accrualRevenue,
      realizedRevenue,
      operationalExpenses,
      payrollCostRecognized: paidPayroll,
      payrollObligations,
      netOperatingProfit,
      realizationEfficiency,
      profitabilityScore,
    },
    balanceSheet: {
      receivablesPending: revenue.kpis.receivablesPending,
      overdueCollections: revenue.kpis.overdueCollections,
      receivableAging,
      payrollObligations,
      operationalLiabilities: payrollObligations,
      liquidityPressureScore,
      complianceExposureScore,
    },
    cashFlow: {
      monthInflow,
      monthOutflow,
      netFlow: monthInflow - monthOutflow,
    },
    profitability: {
      byClient,
      byServiceLine,
    },
    workflowFinancialContinuity: {
      completedTasksAwaitingInvoice,
      unresolvedNoticeCount: unresolvedNotices.length,
      unresolvedNoticeExposureScore,
      overdueApprovalBillingDelay,
      bottleneckProfitabilityPressure,
    },
    financialRisks,
  };
};

