import { supabase } from '../lib/supabase';
import { User } from '../types';
import { createRuntimeNotification } from './notificationRuntimeService';

export type ComplianceCategory = 'GST' | 'Income Tax' | 'ROC' | 'Audit' | 'Custom';
export type ComplianceLifecycleStatus =
  | 'Pending'
  | 'In Progress'
  | 'Awaiting Documents'
  | 'Under Review'
  | 'Approved'
  | 'Filed'
  | 'Late'
  | 'Escalated'
  | 'Closed';

export type ComplianceTaskRow = {
  id: string;
  firm_id: string;
  client_id: string;
  client_name?: string;
  name: string;
  category: ComplianceCategory;
  period: string | null;
  due_date: string;
  filing_status: ComplianceLifecycleStatus;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  filed_date: string | null;
  penalty_amount: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceTaskInput = {
  clientId: string;
  name: string;
  category: ComplianceCategory;
  period?: string;
  dueDate: string;
  assignedTo?: string;
};

const selectCompliance = `
  id,
  firm_id,
  client_id,
  name,
  category,
  period,
  due_date,
  filing_status,
  assigned_to,
  filed_date,
  penalty_amount,
  created_by,
  updated_by,
  created_at,
  updated_at,
  clients(name),
  assignee:users!ct_fk_assignee(name)
`;

const mapComplianceRow = (row: any): ComplianceTaskRow => ({
  id: row.id,
  firm_id: row.firm_id,
  client_id: row.client_id,
  client_name: row.clients?.name,
  name: row.name,
  category: row.category,
  period: row.period,
  due_date: row.due_date,
  filing_status: row.filing_status,
  assigned_to: row.assigned_to,
  assigned_to_name: row.assignee?.name ?? null,
  filed_date: row.filed_date,
  penalty_amount: Number(row.penalty_amount || 0),
  created_by: row.created_by,
  updated_by: row.updated_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const listComplianceTasks = async (firmId: string): Promise<ComplianceTaskRow[]> => {
  const { data, error } = await supabase
    .from('compliance_tasks')
    .select(selectCompliance)
    .eq('firm_id', firmId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapComplianceRow);
};

export const createComplianceTask = async (input: ComplianceTaskInput, user: User): Promise<ComplianceTaskRow> => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  if (!input.clientId) throw new Error('Client is required.');
  if (!input.name.trim()) throw new Error('Compliance name is required.');
  if (!input.dueDate) throw new Error('Due date is required.');

  const { data, error } = await supabase
    .from('compliance_tasks')
    .insert([{
      firm_id: user.firmId,
      client_id: input.clientId,
      name: input.name.trim(),
      category: input.category,
      period: input.period?.trim() || null,
      due_date: input.dueDate,
      filing_status: 'Pending',
      assigned_to: input.assignedTo || null,
      created_by: user.id,
      updated_by: user.id,
    }])
    .select(selectCompliance)
    .single();

  if (error) throw error;

  await supabase.from('audit_logs').insert([{
    firm_id: user.firmId,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'Compliance Created',
    entity_type: 'Compliance',
    entity_id: data.id,
    details: `Created compliance "${input.name.trim()}".`,
  }]);

  if (input.assignedTo) {
    await createRuntimeNotification({
      firmId: user.firmId,
      recipientUserId: input.assignedTo,
      eventType: 'compliance_due',
      title: 'Compliance assigned',
      message: `${input.name.trim()} is due on ${input.dueDate}.`,
      priority: 'HIGH',
      user,
    });
  }

  return mapComplianceRow(data);
};

export const updateComplianceStatus = async (
  complianceId: string,
  status: ComplianceLifecycleStatus,
  user: User,
): Promise<void> => {
  if (!user.firmId) throw new Error('A firm workspace is required.');

  const payload: Record<string, unknown> = {
    filing_status: status,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  if (status === 'Filed' || status === 'Closed') payload.filed_date = new Date().toISOString().slice(0, 10);

  const { data: before, error: beforeError } = await supabase
    .from('compliance_tasks')
    .select('id, name, assigned_to, due_date, filing_status')
    .eq('id', complianceId)
    .eq('firm_id', user.firmId)
    .single();
  if (beforeError) throw beforeError;

  const { error } = await supabase
    .from('compliance_tasks')
    .update(payload)
    .eq('id', complianceId)
    .eq('firm_id', user.firmId);
  if (error) throw error;

  await supabase.from('audit_logs').insert([{
    firm_id: user.firmId,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'Compliance Status Changed',
    entity_type: 'Compliance',
    entity_id: complianceId,
    details: `Compliance "${before.name}" changed from ${before.filing_status} to ${status}.`,
  }]);

  if (before.assigned_to && (status === 'Late' || status === 'Escalated' || status === 'Filed')) {
    await createRuntimeNotification({
      firmId: user.firmId,
      recipientUserId: before.assigned_to,
      eventType: status === 'Filed' ? 'compliance_filed' : status === 'Late' ? 'compliance_overdue' : 'escalation_triggered',
      title: status === 'Filed' ? 'Compliance filed' : status === 'Late' ? 'Compliance overdue' : 'Compliance escalated',
      message: `${before.name} is now ${status}.`,
      priority: status === 'Filed' ? 'MEDIUM' : 'CRITICAL',
      user,
    });
  }
};

export const syncComplianceDueNotifications = async (firmId: string, user: User): Promise<number> => {
  const tasks = await listComplianceTasks(firmId);
  const today = new Date();
  const upcomingLimit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  let created = 0;

  for (const task of tasks) {
    if (!task.assigned_to || ['Filed', 'Closed'].includes(task.filing_status)) continue;
    const due = new Date(task.due_date);
    const isOverdue = due < today;
    const isDueSoon = due <= upcomingLimit;
    if (!isOverdue && !isDueSoon) continue;

    await createRuntimeNotification({
      firmId,
      recipientUserId: task.assigned_to,
      eventType: isOverdue ? 'compliance_overdue' : 'compliance_due',
      title: isOverdue ? 'Compliance overdue' : 'Compliance due soon',
      message: `${task.name}${task.client_name ? ` for ${task.client_name}` : ''} is due on ${task.due_date}.`,
      priority: isOverdue ? 'CRITICAL' : 'HIGH',
      user,
    });
    created += 1;
  }

  return created;
};
