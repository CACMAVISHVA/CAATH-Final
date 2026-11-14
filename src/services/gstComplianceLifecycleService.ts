import { supabase } from '../lib/supabase';
import { User } from '../types';
import { createReminder } from './automationService';

export type GSTClientOption = { id: string; name: string; gstin: string | null; type: string; services?: string[] | null };
export type FilingStatus = 'Draft' | 'Validated' | 'Ready to File' | 'Filed';
export type ChallanStatus = 'Draft' | 'Generated' | 'Paid' | 'Expired';
export type LitigationStatus = 'Open' | 'On hold' | 'Closed';

export type FilingWorkpaper = {
  id: string; client_id: string; gstin: string; return_type: string; filing_frequency: string;
  tax_period: string; due_date: string | null; status: FilingStatus; source_mode: string;
  validation_errors: number; arn: string | null; client?: { name?: string } | null;
};
export type GSTChallan = {
  id: string; client_id: string; gstin: string; tax_period: string; purpose: string; amount: number;
  due_date: string | null; status: ChallanStatus; challan_number: string | null;
  payment_reference: string | null; client?: { name?: string } | null;
};
export type GSTLitigation = {
  id: string; client_id: string; gstin: string; case_number: string; forum: string; stage: string;
  hearing_date: string | null; response_due_date: string | null; amount_disputed: number;
  status: LitigationStatus; owner_name: string | null; client?: { name?: string } | null;
};

const requireWorkspace = (user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  return user.firmId;
};

const scheduleLifecycleReminder = async (params: { user: User; dueDate?: string; entityType: string; entityId: string; title: string; message: string }) => {
  if (!params.user.firmId || !params.dueDate) return;
  const due = new Date(`${params.dueDate}T03:30:00.000Z`);
  if (Number.isNaN(due.getTime())) return;
  const advance = new Date(due.getTime() - (3 * 24 * 60 * 60 * 1000));
  const triggerAt = new Date(Math.max(advance.getTime(), Date.now() + 60_000)).toISOString();
  try {
    await createReminder({
      firmId: params.user.firmId, userId: params.user.id, reminderType: 'COMPLIANCE_DUE',
      title: params.title, message: params.message, triggerAt, entityType: params.entityType, entityId: params.entityId,
    });
  } catch (error) {
    console.warn('GST lifecycle record saved, but its reminder could not be scheduled.', error);
  }
};

export const loadGSTComplianceLifecycle = async (firmId: string) => {
  const [clients, filings, challans, litigation] = await Promise.all([
    supabase.from('clients').select('id,name,gstin,type,services').eq('firm_id', firmId).contains('services', ['GST Filing']).order('name'),
    supabase.from('gst_filing_workpapers').select('*,client:clients(name)').eq('firm_id', firmId).order('due_date'),
    supabase.from('gst_challan_register').select('*,client:clients(name)').eq('firm_id', firmId).order('due_date'),
    supabase.from('gst_litigation_cases').select('*,client:clients(name)').eq('firm_id', firmId).order('hearing_date'),
  ]);
  const error = clients.error || filings.error || challans.error || litigation.error;
  if (error) throw error;
  return {
    clients: (clients.data || []) as GSTClientOption[],
    filings: (filings.data || []) as unknown as FilingWorkpaper[],
    challans: (challans.data || []) as unknown as GSTChallan[],
    litigation: (litigation.data || []) as unknown as GSTLitigation[],
  };
};

export const createFilingWorkpaper = async (user: User, input: { client: GSTClientOption; returnType: string; frequency: string; taxPeriod: string; dueDate?: string }) => {
  const firmId = requireWorkspace(user);
  if (!input.client.gstin) throw new Error('The selected client needs a valid GSTIN.');
  const { data, error } = await supabase.from('gst_filing_workpapers').insert({
    firm_id: firmId, client_id: input.client.id, gstin: input.client.gstin, return_type: input.returnType,
    filing_frequency: input.frequency, tax_period: input.taxPeriod.trim(), due_date: input.dueDate || null, created_by: user.id,
  }).select('id').single();
  if (error?.code === '23505') throw new Error('A workpaper already exists for this return and period.');
  if (error) throw error;
  await scheduleLifecycleReminder({ user, dueDate: input.dueDate, entityType: 'GSTFilingWorkpaper', entityId: data.id, title: `${input.returnType} filing due`, message: `${input.returnType} for ${input.client.name} (${input.taxPeriod}) is approaching its due date.` });
};

export const createGSTChallan = async (user: User, input: { client: GSTClientOption; taxPeriod: string; purpose: string; amount: number; dueDate?: string }) => {
  const firmId = requireWorkspace(user);
  if (!input.client.gstin) throw new Error('The selected client needs a valid GSTIN.');
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('Enter a valid challan amount.');
  const { data, error } = await supabase.from('gst_challan_register').insert({
    firm_id: firmId, client_id: input.client.id, gstin: input.client.gstin, tax_period: input.taxPeriod.trim(),
    purpose: input.purpose.trim(), amount: input.amount, due_date: input.dueDate || null, created_by: user.id,
  }).select('id').single();
  if (error) throw error;
  await scheduleLifecycleReminder({ user, dueDate: input.dueDate, entityType: 'GSTChallan', entityId: data.id, title: 'GST challan payment due', message: `GST challan of ₹${input.amount.toLocaleString('en-IN')} for ${input.client.name} is approaching its due date.` });
};

export const createGSTLitigation = async (user: User, input: { client: GSTClientOption; caseNumber: string; forum: string; stage: string; responseDueDate?: string; amountDisputed: number; ownerName?: string }) => {
  const firmId = requireWorkspace(user);
  if (!input.client.gstin) throw new Error('The selected client needs a valid GSTIN.');
  const { data, error } = await supabase.from('gst_litigation_cases').insert({
    firm_id: firmId, client_id: input.client.id, gstin: input.client.gstin, case_number: input.caseNumber.trim(),
    forum: input.forum, stage: input.stage, response_due_date: input.responseDueDate || null,
    amount_disputed: input.amountDisputed, owner_name: input.ownerName?.trim() || null, created_by: user.id,
  }).select('id').single();
  if (error?.code === '23505') throw new Error('This case number is already tracked.');
  if (error) throw error;
  await scheduleLifecycleReminder({ user, dueDate: input.responseDueDate, entityType: 'GSTLitigation', entityId: data.id, title: 'GST case response due', message: `${input.caseNumber} for ${input.client.name} is approaching its response deadline.` });
};

export const updateLifecycleStatus = async (table: 'gst_filing_workpapers' | 'gst_challan_register' | 'gst_litigation_cases', id: string, status: string) => {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (table === 'gst_challan_register' && status === 'Paid') updates.paid_at = new Date().toISOString();
  const { error } = await supabase.from(table).update(updates).eq('id', id);
  if (error) throw error;
};
