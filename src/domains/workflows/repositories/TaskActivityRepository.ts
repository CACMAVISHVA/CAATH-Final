import { supabase } from '../../../lib/supabase';
import { User } from '../../../types';
import { ITaskActivityRepository } from '../interfaces/ITaskActivityRepository';

export class TaskActivityRepository implements ITaskActivityRepository {
  async createTaskActivity(input: {
    taskId: string;
    user: User;
    type: string;
    details: string;
    previousValue?: string;
    newValue?: string;
  }): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('task_activities')
      .insert([
        {
          task_id: input.taskId,
          user_id: input.user.id,
          user_name: input.user.name,
          user_role: input.user.role,
          activity_type: input.type,
          details: input.details,
          previous_value: input.previousValue || null,
          new_value: input.newValue || null,
        },
      ])
      .select('id')
      .single();

    if (error) return null;
    return data as { id: string };
  }

  async listTaskActivities(taskId: string) {
    const { data, error } = await supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  }

  async addTaskComment(taskId: string, user: User, content: string): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('task_comments')
      .insert([
        {
          task_id: taskId,
          user_id: user.id,
          user_name: user.name,
          user_role: user.role,
          content,
        },
      ])
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  }

  async listTaskComments(taskId: string) {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  }

  async deleteTaskComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('task_comments').delete().eq('id', commentId).eq('user_id', userId);
    if (error) throw error;
  }

  async updateTaskComment(commentId: string, userId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('task_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async listTaskIdsByFirm(firmId: string): Promise<string[]> {
    const { data } = await supabase.from('tasks').select('id').eq('firm_id', firmId);
    return (data || []).map((row: any) => row.id);
  }

  async listRecentTaskActivities(taskIds: string[], limit: number) {
    if (taskIds.length === 0) return [];
    const { data, error } = await supabase
      .from('task_activities')
      .select('*')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  }
}
