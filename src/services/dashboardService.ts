/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { getWorkflowLifecycleIntegritySummary } from './workflowLifecycleIntegrityService';

export interface DashboardMetrics {
  activeClients: number;
  pendingApprovals: number;
  overdueTasks: number;
  filingCount: number;
  revenue: number;
  noticesPending: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  rejectedItems: number;
  escalationAlerts: number;
  overloadedStaff: number;
  reassignmentEvents: number;
  pendingWorkloads: number;
  bottleneckTasks: number;
  stalledApprovals: number;
  overdueClusters: number;
  ignoredEscalations: number;
  noticeBacklogs: number;
  orphanWorkflowCount: number;
  noticeTaskSyncFailures: number;
  billingContinuityGaps: number;
  integrityHealthScore: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  userName: string;
  userRole: string;
  createdAt: string;
}

export const getDashboardMetrics = async (firmId: string): Promise<DashboardMetrics> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    clientsResult,
    approvalsResult,
    tasksResult,
    complianceResult,
    billingResult,
    noticesResult,
    integrity,
  ] = await Promise.all([
    // Active clients count
    supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('firm_id', firmId),

    // Pending approvals
    supabase
      .from('approval_tasks')
      .select('id', { count: 'exact' })
      .eq('firm_id', firmId)
      .in('status', ['PENDING', 'UNDER_REVIEW']),

    // Tasks metrics
    supabase
      .from('tasks')
      .select('id, status, deadline', { count: 'exact' })
      .eq('firm_id', firmId),

    // Compliance tasks pending
    supabase
      .from('compliance_tasks')
      .select('id', { count: 'exact' })
      .eq('firm_id', firmId)
      .eq('filing_status', 'Pending'),

    // Revenue (paid invoices sum)
    supabase
      .from('billing')
      .select('amount')
      .eq('firm_id', firmId)
      .eq('status', 'Paid'),

    // Pending notices
    supabase
      .from('notices')
      .select('id', { count: 'exact' })
      .eq('firm_id', firmId)
      .in('status', ['Received', 'Assigned']),
    getWorkflowLifecycleIntegritySummary(firmId),
  ]);

  // Calculate overdue tasks
  const allTasks = (tasksResult.data || []) as any[];
  const overdueTasks = allTasks.filter(
    (t: { deadline: string | null; status: string }) =>
      t.deadline && new Date(t.deadline) < now && t.status !== 'Completed'
  ).length;

  // Revenue sum
  const revenue = (billingResult.data || []).reduce(
    (sum: number, item: { amount: number }) => sum + (item.amount || 0),
    0
  );

  // Task status breakdown
  const taskStatusCounts = allTasks.reduce((acc: Record<string, number>, t: { status: string }) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const pendingWorkloads = allTasks.filter((t: { status: string }) => !['Completed', 'Archived'].includes(t.status)).length;
  const bottleneckTasks = allTasks.filter((t: { status: string; deadline: string | null }) =>
    ['Assigned', 'Under Review', 'Reassigned', 'Escalated', 'Review'].includes(t.status) &&
    t.deadline && new Date(t.deadline) < now
  ).length;
  const escalationAlerts = allTasks.filter((t: { status: string; deadline: string | null }) =>
    t.status === 'Escalated' ||
    (t.deadline && new Date(t.deadline) < now && !['Completed', 'Archived'].includes(t.status))
  ).length;

  const userTaskCounts: Record<string, number> = {};
  allTasks.forEach((t: { assigned_to: string | null; status: string }) => {
    if (!t.assigned_to) return;
    if (['Completed', 'Archived'].includes(t.status)) return;
    userTaskCounts[t.assigned_to] = (userTaskCounts[t.assigned_to] || 0) + 1;
  });

  const overloadedStaff = Object.values(userTaskCounts).filter((count) => count >= 8).length;

  let reassignmentEvents = 0;
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: reassignmentData, error: reassignmentError } = await supabase
      .from('task_reassignments')
      .select('id')
      .eq('firm_id', firmId)
      .gte('created_at', thirtyDaysAgo);

    if (!reassignmentError && reassignmentData) {
      reassignmentEvents = reassignmentData.length;
    }
  } catch (error) {
    console.warn('Failed to load reassignment event metrics:', error);
  }

  // Bottleneck computations
  let stalledApprovals = 0;
  let overdueClusters = 0;
  let ignoredEscalations = 0;
  let noticeBacklogs = 0;

  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stalledData } = await supabase
      .from('approval_tasks')
      .select('id')
      .eq('firm_id', firmId)
      .in('status', ['PENDING', 'UNDER_REVIEW'])
      .lte('updated_at', sevenDaysAgo);
    stalledApprovals = stalledData ? stalledData.length : 0;
  } catch (e) {
    console.warn('Failed to compute stalled approvals', e);
  }

  try {
    // Group overdue tasks by client and count clusters (>=3 overdue tasks per client)
    const overdueByClient: Record<string, number> = {};
    (allTasks || []).forEach((t: any) => {
      if (t.deadline && new Date(t.deadline) < now && t.status !== 'Completed') {
        const key = t.client_id || 'unassigned';
        overdueByClient[key] = (overdueByClient[key] || 0) + 1;
      }
    });
    overdueClusters = Object.values(overdueByClient).filter((c) => c >= 3).length;
  } catch (e) {
    console.warn('Failed to compute overdue clusters', e);
  }

  try {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    ignoredEscalations = allTasks.filter((t: any) => t.status === 'Escalated' && t.updated_at && new Date(t.updated_at) <= new Date(threeDaysAgo)).length;
  } catch (e) {
    console.warn('Failed to compute ignored escalations', e);
  }

  try {
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: noticeData } = await supabase
      .from('notices')
      .select('id')
      .eq('firm_id', firmId)
      .in('status', ['Received', 'Assigned'])
      .lte('created_at', fiveDaysAgo);
    noticeBacklogs = noticeData ? noticeData.length : 0;
  } catch (e) {
    console.warn('Failed to compute notice backlogs', e);
  }

  return {
    activeClients: clientsResult.count || 0,
    pendingApprovals: approvalsResult.count || 0,
    overdueTasks,
    filingCount: complianceResult.count || 0,
    revenue,
    noticesPending: noticesResult.count || 0,
    totalTasks: tasksResult.count || 0,
    completedTasks: taskStatusCounts['Completed'] || 0,
    inProgressTasks: taskStatusCounts['In Progress'] || 0,
    rejectedItems: 0,
    escalationAlerts,
    overloadedStaff,
    reassignmentEvents,
    pendingWorkloads,
    bottleneckTasks,
    stalledApprovals,
    overdueClusters,
    ignoredEscalations,
    noticeBacklogs,
    orphanWorkflowCount: integrity.counts.orphanWorkflows,
    noticeTaskSyncFailures: integrity.counts.noticeTaskSyncFailures,
    billingContinuityGaps: integrity.counts.billingContinuityGaps,
    integrityHealthScore: integrity.workflowHealthScore,
  };
};

export const getRecentActivity = async (firmId: string, limit = 20): Promise<ActivityItem[]> => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    userName: log.user_name,
    userRole: log.user_role,
    createdAt: log.created_at,
  }));
};

export const getOverdueTasks = async (firmId: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('firm_id', firmId)
    .lt('deadline', now)
    .neq('status', 'Completed')
    .order('deadline', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getUpcomingFilings = async (firmId: string, days = 7) => {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('*, clients(name)')
    .eq('firm_id', firmId)
    .eq('filing_status', 'Pending')
    .gte('due_date', now.toISOString().split('T')[0])
    .lte('due_date', future.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getStaffPerformance = async (firmId: string) => {
  const { data: users } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('firm_id', firmId)
    .in('role', ['Admin', 'Staff'])
    .eq('status', 'Active');

  if (!users) return [];

  // Get task counts per user
  const { data: tasks } = await supabase
    .from('tasks')
    .select('assigned_to, status')
    .eq('firm_id', firmId);

  if (!tasks) return users.map((u) => ({ ...u, tasksCompleted: 0, tasksInProgress: 0 }));

  return users.map((user) => {
    const userTasks = tasks.filter((t) => t.assigned_to === user.id);
    return {
      ...user,
      tasksCompleted: userTasks.filter((t) => t.status === 'Completed').length,
      tasksInProgress: userTasks.filter((t) => t.status === 'In Progress').length,
    };
  });
};
