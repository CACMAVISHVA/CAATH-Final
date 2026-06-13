import { supabase } from '../../../lib/supabase';
import { TaskRow, TaskStatus } from '../services/taskDomainService';

export type UserRoleRow = { id: string; role: 'GodAdmin' | 'SuperAdmin' | 'Admin' | 'Staff' | 'Client'; firm_id: string | null };

export const taskRepository = {
  insertAuditLog(payload: Record<string, unknown>) {
    return supabase.from('audit_logs').insert([payload]);
  },
  getUserRoleInFirm(userId: string, firmId: string) {
    return supabase.from('users').select('id, role, firm_id').eq('id', userId).eq('firm_id', firmId).maybeSingle();
  },
  createTask(payload: Record<string, unknown>) {
    return supabase.from('tasks').insert([payload]).select('id').single();
  },
  getTaskById(taskId: string) {
    return supabase.from('tasks').select('id, status, title, assigned_to').eq('id', taskId).single();
  },
  updateTask(taskId: string, firmId: string, payload: Record<string, unknown>) {
    return supabase.from('tasks').update(payload).eq('id', taskId).eq('firm_id', firmId);
  },
  listTasks(firmId: string) {
    return supabase.from('tasks').select('*').eq('firm_id', firmId).order('created_at', { ascending: false });
  },
  listTaskAssignments(taskIds: string[], firmId: string) {
    return supabase.from('tasks').select('id, assigned_to, title').in('id', taskIds).eq('firm_id', firmId);
  },
  bulkUpdateTasks(taskIds: string[], firmId: string, payload: Record<string, unknown>) {
    return supabase.from('tasks').update(payload).in('id', taskIds).eq('firm_id', firmId);
  },
  deleteTask(taskId: string, firmId: string) {
    return supabase.from('tasks').delete().eq('id', taskId).eq('firm_id', firmId);
  },
  insertReassignmentRecord(payload: Record<string, unknown>) {
    return supabase.from('task_reassignments').insert([payload]);
  },
  getReassignmentHistory(taskId: string) {
    return supabase.from('task_reassignments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
  },
  getMyTasks(userId: string, firmId: string) {
    return supabase.from('tasks').select('*').eq('firm_id', firmId).eq('assigned_to', userId).order('created_at', { ascending: false });
  },
  listActiveStaff(firmId: string) {
    return supabase.from('users').select('id, name, email, role').eq('firm_id', firmId).in('role', ['SuperAdmin', 'Admin', 'Staff']).eq('status', 'Active').order('name');
  },
  listActiveUsersByRole(firmId: string, role: 'Admin' | 'Staff') {
    return supabase.from('users').select('id, name, email, role').eq('firm_id', firmId).eq('role', role).eq('status', 'Active').order('name');
  },
  listOpenAssignments(firmId: string) {
    return supabase.from('tasks').select('assigned_to, status').eq('firm_id', firmId).in('status', ['Todo', 'In Progress', 'Review']);
  },
  listClientsBasic(firmId: string) {
    return supabase.from('clients').select('id, name').eq('firm_id', firmId).order('name');
  },
};
