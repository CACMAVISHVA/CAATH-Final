/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SubtaskInput {
  taskId: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  user: User;
}

export const createSubtask = async ({
  taskId,
  title,
  description,
  dueDate,
  assignedTo,
  user,
}: SubtaskInput) => {
  const { data, error } = await supabase
    .from('subtasks')
    .insert([{
      task_id: taskId,
      title,
      description,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      completed: false,
      created_by: user.id,
    }])
    .select('id')
    .single();

  if (error) throw error;
  return data;
};

export const getSubtasks = async (taskId: string): Promise<Subtask[]> => {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Subtask[];
};

export const updateSubtask = async (
  subtaskId: string,
  updates: Partial<{
    title: string;
    description: string;
    completed: boolean;
    due_date: string;
    assigned_to: string;
  }>,
  userId: string
) => {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subtasks')
    .update(updateData)
    .eq('id', subtaskId);

  if (error) throw error;
};

export const toggleSubtaskComplete = async (subtaskId: string, completed: boolean, userId: string) => {
  const { error } = await supabase
    .from('subtasks')
    .update({
      completed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subtaskId);

  if (error) throw error;
};

export const deleteSubtask = async (subtaskId: string) => {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) throw error;
};

// Get subtask progress for a task
export const getSubtaskProgress = async (taskId: string): Promise<{ completed: number; total: number; percentage: number }> => {
  const subtasks = await getSubtasks(taskId);
  const completed = subtasks.filter(s => s.completed).length;
  const total = subtasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
};

// Get overdue subtasks for a user
export const getOverdueSubtasks = async (userId: string, firmId: string): Promise<Subtask[]> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('subtasks')
    .select('*, tasks(firm_id, title)')
    .eq('assigned_to', userId)
    .eq('completed', false)
    .lt('due_date', today);

  if (error) throw error;
  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id,
    task_id: s.task_id,
    title: s.title,
    description: s.description,
    completed: s.completed,
    due_date: s.due_date,
    assigned_to: s.assigned_to,
    created_by: s.created_by,
    created_at: s.created_at,
    updated_at: s.updated_at,
  })) as Subtask[];
};