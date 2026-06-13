import { User } from '../../../types';

export type ActivityType =
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'status_changed'
  | 'priority_changed'
  | 'deadline_changed'
  | 'comment_added'
  | 'description_updated'
  | 'category_changed'
  | 'completed';

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  activity_type: ActivityType;
  details: string;
  previous_value?: string;
  new_value?: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ITaskActivityRepository {
  createTaskActivity(input: {
    taskId: string;
    user: User;
    type: ActivityType;
    details: string;
    previousValue?: string;
    newValue?: string;
  }): Promise<{ id: string } | null>;
  listTaskActivities(taskId: string): Promise<TaskActivity[]>;
  addTaskComment(taskId: string, user: User, content: string): Promise<{ id: string }>;
  listTaskComments(taskId: string): Promise<TaskComment[]>;
  deleteTaskComment(commentId: string, userId: string): Promise<void>;
  updateTaskComment(commentId: string, userId: string, content: string): Promise<void>;
  listTaskIdsByFirm(firmId: string): Promise<string[]>;
  listRecentTaskActivities(taskIds: string[], limit: number): Promise<TaskActivity[]>;
}
