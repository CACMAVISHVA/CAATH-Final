import { User } from '../../../types';
import { emitWorkflowEvent } from '../events/workflowEvents';
import { requireTenantContext } from '../context/tenantContext';
import { ActivityType, ITaskActivityRepository, TaskActivity, TaskComment } from '../interfaces/ITaskActivityRepository';
import { TaskActivityRepository } from '../repositories/TaskActivityRepository';

const formatActivityDetails = (
  type: ActivityType,
  userName: string,
  previous?: string,
  nextValue?: string,
): string => {
  switch (type) {
    case 'created': return `Task created by ${userName}`;
    case 'assigned': return `Assigned to ${nextValue || 'unassigned'} by ${userName}`;
    case 'reassigned': return `Reassigned from ${previous || 'unassigned'} to ${nextValue || 'unassigned'} by ${userName}`;
    case 'status_changed': return `Status changed from ${previous || 'none'} to ${nextValue || 'none'} by ${userName}`;
    case 'priority_changed': return `Priority changed from ${previous || 'none'} to ${nextValue || 'none'} by ${userName}`;
    case 'deadline_changed': return `Deadline changed from ${previous || 'none'} to ${nextValue || 'none'} by ${userName}`;
    case 'comment_added': return `${userName} added a comment`;
    case 'description_updated': return `Description updated by ${userName}`;
    case 'category_changed': return `Category changed from ${previous || 'none'} to ${nextValue || 'none'} by ${userName}`;
    case 'completed': return `Task marked as completed by ${userName}`;
    default: return `Activity by ${userName}`;
  }
};

export class TaskActivityWorkflowService {
  constructor(private readonly repository: ITaskActivityRepository = new TaskActivityRepository()) {}

  async logTaskActivity(taskId: string, user: User, type: ActivityType, previousValue?: string, newValue?: string) {
    const context = requireTenantContext(user);
    const details = formatActivityDetails(type, user.name, previousValue, newValue);
    const created = await this.repository.createTaskActivity({ taskId, user, type, details, previousValue, newValue });

    if (created) {
      await emitWorkflowEvent('TASK_ACTIVITY_CREATED', { taskId, activityType: type, actorId: user.id }, context.firmId, user.id);
    }

    return created;
  }

  getTaskActivities(taskId: string): Promise<TaskActivity[]> {
    return this.repository.listTaskActivities(taskId);
  }

  async addTaskComment(taskId: string, user: User, content: string) {
    if (!content.trim()) throw new Error('Comment cannot be empty');
    const created = await this.repository.addTaskComment(taskId, user, content.trim());
    await this.logTaskActivity(taskId, user, 'comment_added');
    return created;
  }

  getTaskComments(taskId: string): Promise<TaskComment[]> {
    return this.repository.listTaskComments(taskId);
  }

  deleteTaskComment(commentId: string, userId: string): Promise<void> {
    return this.repository.deleteTaskComment(commentId, userId);
  }

  async updateTaskComment(commentId: string, userId: string, content: string): Promise<void> {
    if (!content.trim()) throw new Error('Comment cannot be empty');
    return this.repository.updateTaskComment(commentId, userId, content.trim());
  }

  async getRecentTaskActivities(firmId: string, limit = 50): Promise<TaskActivity[]> {
    const taskIds = await this.repository.listTaskIdsByFirm(firmId);
    return this.repository.listRecentTaskActivities(taskIds, limit);
  }
}

export const taskActivityWorkflowService = new TaskActivityWorkflowService();
