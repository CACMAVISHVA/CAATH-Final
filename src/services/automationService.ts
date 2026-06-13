/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export type ReminderType = 'TASK_DEADLINE' | 'COMPLIANCE_DUE' | 'NOTICE_DEADLINE' | 'APPROVAL_PENDING' | 'BILLING_DUE' | 'CUSTOM';
export type ReminderFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ReminderStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type ReminderRow = {
  id: string;
  firm_id: string;
  user_id: string;
  entity_type: string | null;
  entity_id: string | null;
  reminder_type: ReminderType;
  title: string;
  message: string;
  trigger_at: string;
  frequency: ReminderFrequency;
  status: ReminderStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderInput = {
  firmId: string;
  userId: string;
  reminderType: ReminderType;
  title: string;
  message: string;
  triggerAt: string;
  frequency?: ReminderFrequency;
  entityType?: string;
  entityId?: string;
};

export const createReminder = async (input: ReminderInput) => {
  const { data, error } = await supabase
    .from('reminders')
    .insert([{
      firm_id: input.firmId,
      user_id: input.userId,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      reminder_type: input.reminderType,
      title: input.title,
      message: input.message,
      trigger_at: input.triggerAt,
      frequency: input.frequency || 'ONCE',
      status: 'ACTIVE',
    }])
    .select('id')
    .single();

  if (error) throw error;
  return data;
};

export const updateReminderStatus = async (reminderId: string, status: ReminderStatus) => {
  const { error } = await supabase
    .from('reminders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (error) throw error;
};

export const pauseReminder = async (reminderId: string) => {
  return updateReminderStatus(reminderId, 'PAUSED');
};

export const resumeReminder = async (reminderId: string) => {
  return updateReminderStatus(reminderId, 'ACTIVE');
};

export const cancelReminder = async (reminderId: string) => {
  return updateReminderStatus(reminderId, 'CANCELLED');
};

export const completeReminder = async (reminderId: string) => {
  return updateReminderStatus(reminderId, 'COMPLETED');
};

export const getMyReminders = async (userId: string, firmId: string) => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .in('status', ['ACTIVE', 'PAUSED'])
    .order('trigger_at', { ascending: true });

  if (error) throw error;
  return data as ReminderRow[];
};

export const getUpcomingReminders = async (firmId: string, days = 7) => {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('firm_id', firmId)
    .eq('status', 'ACTIVE')
    .gte('trigger_at', now.toISOString())
    .lte('trigger_at', future.toISOString())
    .order('trigger_at', { ascending: true });

  if (error) throw error;
  return data as ReminderRow[];
};

export const deleteReminder = async (reminderId: string) => {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);

  if (error) throw error;
};

export const createTaskDeadlineReminder = async (
  firmId: string,
  userId: string,
  taskId: string,
  taskTitle: string,
  deadline: string,
  user: User
) => {
  return createReminder({
    firmId,
    userId,
    reminderType: 'TASK_DEADLINE',
    title: `Task Deadline: ${taskTitle}`,
    message: `Your task "${taskTitle}" is due on ${new Date(deadline).toLocaleDateString()}.`,
    triggerAt: deadline,
    entityType: 'Task',
    entityId: taskId,
  });
};

export const createComplianceDueReminder = async (
  firmId: string,
  userId: string,
  complianceId: string,
  clientName: string,
  dueDate: string,
  complianceType: string
) => {
  return createReminder({
    firmId,
    userId,
    reminderType: 'COMPLIANCE_DUE',
    title: `Compliance Due: ${complianceType}`,
    message: `${complianceType} for ${clientName} is due on ${new Date(dueDate).toLocaleDateString()}.`,
    triggerAt: dueDate,
    entityType: 'ComplianceTask',
    entityId: complianceId,
  });
};

export const getDueReminders = async (userId: string): Promise<ReminderRow[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .lte('trigger_at', now)
    .order('trigger_at', { ascending: true });

  if (error) throw error;
  return data as ReminderRow[];
};