import { supabase } from '../lib/supabase';
import { getReceivablesSummary } from './invoiceService';
import { TaskRow } from './taskService';

export interface RevenueKpiSnapshot {
  revenueReceivedThisMonth: number;
  receivablesPending: number;
  overdueCollections: number;
  invoicesPendingGeneration: number;
  completedTasksAwaitingBilling: number;
  revenueRealizationRate: number;
  billingBottleneckCount: number;
  unresolvedNoticeCount: number;
  unresolvedNoticeRiskHigh: number;
}

export interface RevenueBreakdown {
  byService: Array<{ service: string; amount: number }>;
  byClient: Array<{ clientId: string; clientName: string; amount: number }>;
}

export interface WorkflowBillingSignal {
  taskId: string;
  taskTitle: string;
  clientId: string | null;
  status: string;
  risk: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface RevenueIntelligenceSnapshot {
  generatedAt: string;
  kpis: RevenueKpiSnapshot;
  breakdown: RevenueBreakdown;
  workflowSignals: WorkflowBillingSignal[];
}

const COMPLETED_STATUSES = new Set(['Completed']);

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  return { start, end };
};

const toRisk = (days: number): 'low' | 'medium' | 'high' => {
  if (days >= 20) return 'high';
  if (days >= 10) return 'medium';
  return 'low';
};

export const getRevenueIntelligenceSnapshot = async (firmId: string): Promise<RevenueIntelligenceSnapshot> => {
  const { start, end } = currentMonthRange();
  const now = new Date();

  const [invoicesRes, tasksRes, clientsRes, noticesRes, receivables] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, client_id, invoice_number, issue_date, due_date, billing_category, status, total, paid_amount, pending_amount')
      .eq('firm_id', firmId)
      .neq('status', 'Cancelled'),
    supabase
      .from('tasks')
      .select('id, title, client_id, status, updated_at')
      .eq('firm_id', firmId),
    supabase
      .from('clients')
      .select('id, name')
      .eq('firm_id', firmId),
    supabase
      .from('notices')
      .select('id, status, deadline')
      .eq('firm_id', firmId),
    getReceivablesSummary(firmId),
  ]);

  if (invoicesRes.error) throw invoicesRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (clientsRes.error) throw clientsRes.error;
  if (noticesRes.error) throw noticesRes.error;

  const invoices = invoicesRes.data || [];
  const tasks = (tasksRes.data || []) as Pick<TaskRow, 'id' | 'title' | 'client_id' | 'status' | 'updated_at'>[];
  const clients = clientsRes.data || [];
  const notices = noticesRes.data || [];

  const clientNameMap = new Map(clients.map((client) => [client.id, client.name]));

  const revenueReceivedThisMonth = invoices
    .filter((inv) => inv.status === 'Paid' && inv.issue_date >= start && inv.issue_date < end)
    .reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

  const receivablesPending = receivables.totalPending;
  const overdueCollections = receivables.totalOverdue;

  const invoicesByClient = new Map<string, number>();
  const serviceRevenue = new Map<string, number>();
  invoices.forEach((inv) => {
    if (inv.client_id) {
      invoicesByClient.set(inv.client_id, (invoicesByClient.get(inv.client_id) || 0) + 1);
    }
    const key = inv.billing_category || 'Other';
    serviceRevenue.set(key, (serviceRevenue.get(key) || 0) + (inv.total || 0));
  });

  const completedTasks = tasks.filter((task) => COMPLETED_STATUSES.has(task.status || ''));
  const completedTasksAwaitingBillingRows = completedTasks.filter((task) => {
    if (!task.client_id) return true;
    return !invoicesByClient.get(task.client_id);
  });

  const invoicesPendingGeneration = completedTasksAwaitingBillingRows.length;
  const completedTasksAwaitingBilling = completedTasksAwaitingBillingRows.length;

  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const revenueRealizationRate = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;

  const billingBottleneckCount = invoices.filter((inv) => {
    const dueDate = new Date(inv.due_date);
    return inv.pending_amount > 0 && dueDate < now;
  }).length + completedTasksAwaitingBillingRows.length;

  const unresolvedNotices = notices.filter((notice) => !['Filed', 'Closed'].includes(notice.status || ''));
  const unresolvedNoticeCount = unresolvedNotices.length;
  const unresolvedNoticeRiskHigh = unresolvedNotices.filter((notice) => {
    if (!notice.deadline) return false;
    return new Date(notice.deadline) < now;
  }).length;

  const workflowSignals: WorkflowBillingSignal[] = completedTasksAwaitingBillingRows
    .map((task) => {
      const completedAt = task.updated_at ? new Date(task.updated_at) : now;
      const ageInDays = Math.max(0, Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24)));
      const risk = toRisk(ageInDays);
      return {
        taskId: task.id,
        taskTitle: task.title,
        clientId: task.client_id,
        status: task.status,
        risk,
        recommendation:
          risk === 'high'
            ? 'Generate invoice immediately and assign billing owner to prevent revenue leakage.'
            : risk === 'medium'
              ? 'Prioritize in next billing cycle and confirm billable scope.'
              : 'Queue for normal billing workflow and verify billable flags.',
      };
    })
    .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === 'high' ? -1 : b.risk === 'high' ? 1 : a.risk === 'medium' ? -1 : 1));

  const byService = Array.from(serviceRevenue.entries())
    .map(([service, amount]) => ({ service, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byClientMap = new Map<string, number>();
  invoices.forEach((inv) => {
    if (!inv.client_id) return;
    byClientMap.set(inv.client_id, (byClientMap.get(inv.client_id) || 0) + (inv.total || 0));
  });

  const byClient = Array.from(byClientMap.entries())
    .map(([clientId, amount]) => ({
      clientId,
      clientName: clientNameMap.get(clientId) || 'Unknown Client',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      revenueReceivedThisMonth,
      receivablesPending,
      overdueCollections,
      invoicesPendingGeneration,
      completedTasksAwaitingBilling,
      revenueRealizationRate,
      billingBottleneckCount,
      unresolvedNoticeCount,
      unresolvedNoticeRiskHigh,
    },
    breakdown: {
      byService,
      byClient,
    },
    workflowSignals,
  };
};
