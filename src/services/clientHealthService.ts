/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';

export interface ClientHealthScore {
  overallScore: number;
  complianceScore: number;
  billingScore: number;
  taskScore: number;
  documentScore: number;
}

export interface ClientStats {
  totalRevenue: number;
  pendingPayments: number;
  overdueAmount: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingFilings: number;
  overdueFilings: number;
  pendingDocuments: number;
}

export const calculateClientHealth = async (clientId: string, firmId: string): Promise<ClientHealthScore> => {
  // Get client tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('client_id', clientId)
    .eq('firm_id', firmId);

  // Get client invoices (would come from billing service)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .eq('firm_id', firmId);

  // Get client compliances (would come from compliance service)
  const { data: compliances } = await supabase
    .from('completions') // Would be 'compliance_records' in production
    .select('*')
    .eq('client_id', clientId);

  // Calculate scores
  let complianceScore = 100;
  let taskScore = 100;
  let billingScore = 100;
  let documentScore = 100;

  // Task score calculation
  if (tasks && tasks.length > 0) {
    const overdueTasks = tasks.filter(t =>
      t.status !== 'Completed' &&
      t.deadline &&
      new Date(t.deadline) < new Date()
    ).length;
    taskScore = Math.max(0, 100 - (overdueTasks * 15));
  }

  // Billing score calculation (mock data structure)
  if (invoices && invoices.length > 0) {
    const overdueInvoices = invoices.filter((i: Record<string, unknown>) =>
      i.status === 'Overdue'
    ).length;
    billingScore = Math.max(0, 100 - (overdueInvoices * 10));
  }

  // Compliance score calculation
  if (compliances && compliances.length > 0) {
    const overdueCompliances = compliances.filter((c: Record<string, unknown>) =>
      c.status === 'Late'
    ).length;
    complianceScore = Math.max(0, 100 - (overdueCompliances * 25));
  }

  // Calculate overall score
  const overallScore = Math.round(
    (complianceScore * 0.3) +
    (billingScore * 0.25) +
    (taskScore * 0.3) +
    (documentScore * 0.15)
  );

  return {
    overallScore,
    complianceScore,
    billingScore,
    taskScore,
    documentScore,
  };
};

export const getClientStats = async (clientId: string, firmId: string): Promise<ClientStats> => {
  // Tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('client_id', clientId)
    .eq('firm_id', firmId);

  const activeTasks = tasks?.filter(t => t.status !== 'Completed').length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'Completed').length || 0;
  const overdueTasks = tasks?.filter(t =>
    t.status !== 'Completed' &&
    t.deadline &&
    new Date(t.deadline) < new Date()
  ).length || 0;

  // Mock billing data (would come from billing service)
  const totalRevenue = 1250000;
  const pendingPayments = 185000;
  const overdueAmount = 45000;

  // Mock compliance data
  const upcomingFilings = 4;
  const overdueFilings = 1;

  // Mock document data
  const pendingDocuments = 3;

  return {
    totalRevenue,
    pendingPayments,
    overdueAmount,
    activeTasks,
    completedTasks,
    overdueTasks,
    upcomingFilings,
    overdueFilings,
    pendingDocuments,
  };
};

// Get high-risk clients
export const getHighRiskClients = async (firmId: string) => {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .eq('risk_level', 'High')
    .order('name');

  return clients || [];
};

// Get clients needing attention (overdue tasks/payments/filings)
export const getClientsNeedingAttention = async (firmId: string) => {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .order('name');

  if (!clients) return [];

  // Filter clients with risk level High or Medium
  return clients.filter(c => c.risk_level === 'High' || c.risk_level === 'Medium');
};

// Client revenue ranking
export const getTopRevenueClients = async (firmId: string, limit = 10) => {
  // This would aggregate from billing service
  // For now, return clients ordered by name
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .order('name')
    .limit(limit);

  return clients || [];
};

// Client activity timeline
export interface TimelineEvent {
  id: string;
  type: 'task' | 'billing' | 'compliance' | 'document' | 'notice';
  title: string;
  description: string;
  date: string;
}

export const getClientTimeline = async (clientId: string, limit = 50): Promise<TimelineEvent[]> => {
  const events: TimelineEvent[] = [];

  // Get recent tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, created_at, updated_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  tasks?.forEach(task => {
    events.push({
      id: `task-${task.id}`,
      type: 'task',
      title: `Task: ${task.title}`,
      description: `Status: ${task.status}`,
      date: task.updated_at || task.created_at,
    });
  });

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return events.slice(0, limit);
};

// Client search with multiple fields
export const searchClients = async (firmId: string, query: string) => {
  const lowerQuery = query.toLowerCase();

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,pan.ilike.%${query}%,gstin.ilike.%${query}%`)
    .order('name')
    .limit(20);

  return clients || [];
};

// Get client by PAN (for quick lookup)
export const getClientByPAN = async (firmId: string, pan: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .eq('pan', pan.toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
};

// Get client by GSTIN
export const getClientByGSTIN = async (firmId: string, gstin: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .eq('gstin', gstin.toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
};