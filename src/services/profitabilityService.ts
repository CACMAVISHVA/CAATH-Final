/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface ProfitabilityReport {
  clientId: string;
  clientName: string;
  totalBilled: number;
  totalReceived: number;
  totalPending: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  invoiceCount: number;
  paymentEfficiency: number;
}

export interface StaffProductivity {
  staffId: string;
  staffName: string;
  role: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number;
  totalBillableAmount: number;
}

export interface ServiceProfitability {
  service: string;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  margin: number;
  invoiceCount: number;
}

export const getClientProfitability = async (clientId: string): Promise<ProfitabilityReport> => {
  // Get client invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .neq('status', 'Cancelled');

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single();

  // Calculate totals
  const totalBilled = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;
  const totalReceived = invoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0;
  const totalPending = invoices?.reduce((sum, inv) => sum + inv.pending_amount, 0) || 0;

  // Get expenses for this client (if tracked per client)
  const totalExpenses = 0; // Would need expense allocation to client

  const grossProfit = totalReceived - totalExpenses;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalBilled > 0 ? Math.round((netProfit / totalBilled) * 100) : 0;

  const invoiceCount = invoices?.length || 0;
  const paymentEfficiency = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;

  return {
    clientId,
    clientName: client?.name || 'Unknown',
    totalBilled,
    totalReceived,
    totalPending,
    totalExpenses,
    grossProfit,
    netProfit,
    profitMargin,
    invoiceCount,
    paymentEfficiency,
  };
};

export const getAllClientsProfitability = async (firmId: string): Promise<ProfitabilityReport[]> => {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('firm_id', firmId);

  if (!clients) return [];

  const profitability: ProfitabilityReport[] = [];
  for (const client of clients) {
    const report = await getClientProfitability(client.id);
    profitability.push(report);
  }

  return profitability.sort((a, b) => b.netProfit - a.netProfit);
};

export const getStaffProductivity = async (firmId: string): Promise<StaffProductivity[]> => {
  // Get all staff
  const { data: staff } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('firm_id', firmId)
    .in('role', ['Admin', 'Staff'])
    .eq('status', 'Active');

  if (!staff) return [];

  // Get all tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('firm_id', firmId);

  const productivity: StaffProductivity[] = staff.map(member => {
    const memberTasks = tasks?.filter(t => t.assigned_to === member.id) || [];
    const assignedCount = memberTasks.length;
    const completedCount = memberTasks.filter(t => t.status === 'Completed').length;
    const overdueCount = memberTasks.filter(t =>
      t.status !== 'Completed' &&
      t.deadline &&
      new Date(t.deadline) < new Date()
    ).length;

    // Billable amount would come from linking tasks to invoices
    const totalBillableAmount = 0;

    const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

    return {
      staffId: member.id,
      staffName: member.name,
      role: member.role,
      tasksAssigned: assignedCount,
      tasksCompleted: completedCount,
      tasksOverdue: overdueCount,
      completionRate,
      totalBillableAmount,
    };
  });

  return productivity;
};

export const getServiceProfitability = async (firmId: string): Promise<ServiceProfitability[]> => {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('billing_category, total')
    .eq('firm_id', firmId)
    .neq('status', 'Cancelled');

  if (!invoices) return [];

  // Group by service category
  const serviceMap: Record<string, { revenue: number; count: number }> = {};
  invoices.forEach(inv => {
    const cat = inv.billing_category || 'Other';
    serviceMap[cat] = serviceMap[cat] || { revenue: 0, count: 0 };
    serviceMap[cat].revenue += inv.total;
    serviceMap[cat].count += 1;
  });

  // Calculate profitability per service (expenses would need allocation)
  return Object.entries(serviceMap).map(([service, data]) => ({
    service,
    totalRevenue: data.revenue,
    totalExpenses: 0, // Would need expense allocation by service
    profit: data.revenue,
    margin: 100, // Would calculate with real expense data
    invoiceCount: data.count,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);
};

export const getOperationalMetrics = async (firmId: string) => {
  // Revenue metrics
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, paid_amount, status, issue_date')
    .eq('firm_id', firmId)
    .neq('status', 'Cancelled');

  // Task metrics
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status, priority, deadline')
    .eq('firm_id', firmId);

  // Client metrics
  const { count: clientCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId);

  // Calculate metrics
  const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;
  const receivedRevenue = invoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0;
  const pendingRevenue = totalRevenue - receivedRevenue;

  const activeTasks = tasks?.filter(t => t.status !== 'Completed').length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'Completed').length || 0;
  const overdueTasks = tasks?.filter(t =>
    t.status !== 'Completed' &&
    t.deadline &&
    new Date(t.deadline) < new Date()
  ).length || 0;

  // Monthly revenue trend
  const monthlyRevenue: Record<string, number> = {};
  invoices?.forEach(inv => {
    const month = new Date(inv.issue_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + inv.total;
  });

  return {
    revenue: {
      totalBilled: totalRevenue,
      totalReceived: receivedRevenue,
      pendingReceivables: pendingRevenue,
      collectionRate: totalRevenue > 0 ? Math.round((receivedRevenue / totalRevenue) * 100) : 0,
    },
    tasks: {
      active: activeTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completionRate: tasks?.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
    },
    clients: {
      total: clientCount || 0,
      active: clientCount || 0, // Would need status field
    },
    monthlyRevenue,
  };
};

export const getRealizationRate = async (firmId: string): Promise<number> => {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, paid_amount')
    .eq('firm_id', firmId)
    .neq('status', 'Cancelled');

  if (!invoices || invoices.length === 0) return 0;

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);

  return totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
};

export const getOperationalMargin = async (firmId: string): Promise<number> => {
  // Get revenue
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total')
    .eq('firm_id', firmId)
    .neq('status', 'Cancelled');

  const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;

  // Get expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('total')
    .eq('firm_id', firmId)
    .eq('status', 'Paid');

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.total, 0) || 0;

  // Calculate margin
  if (totalRevenue === 0) return 0;
  return Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100);
};
