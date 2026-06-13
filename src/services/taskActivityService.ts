/**
 * Compatibility facade: delegates to workflow domain service.
 */

import { User } from '../types';
import {
  ActivityType,
  TaskActivity,
  TaskComment,
} from '../domains/workflows/interfaces/ITaskActivityRepository';
import { taskActivityWorkflowService } from '../domains/workflows/services/taskActivityWorkflowService';

export type { ActivityType, TaskActivity, TaskComment };

export const logTaskActivity = (
  taskId: string,
  user: User,
  type: ActivityType,
  previousValue?: string,
  newValue?: string,
) => taskActivityWorkflowService.logTaskActivity(taskId, user, type, previousValue, newValue);

export const getTaskActivities = (taskId: string) => taskActivityWorkflowService.getTaskActivities(taskId);

export const addTaskComment = (taskId: string, user: User, content: string) =>
  taskActivityWorkflowService.addTaskComment(taskId, user, content);

export const getTaskComments = (taskId: string) => taskActivityWorkflowService.getTaskComments(taskId);

export const deleteTaskComment = (commentId: string, userId: string) =>
  taskActivityWorkflowService.deleteTaskComment(commentId, userId);

export const updateTaskComment = (commentId: string, userId: string, content: string) =>
  taskActivityWorkflowService.updateTaskComment(commentId, userId, content);

export const logTaskCreated = (taskId: string, user: User) => logTaskActivity(taskId, user, 'created');
export const logTaskAssigned = (taskId: string, user: User, assigneeName?: string) =>
  logTaskActivity(taskId, user, 'assigned', undefined, assigneeName);
export const logTaskReassigned = (taskId: string, user: User, previousAssignee?: string, newAssignee?: string) =>
  logTaskActivity(taskId, user, 'reassigned', previousAssignee, newAssignee);
export const logTaskStatusChanged = (taskId: string, user: User, previousStatus?: string, newStatus?: string) =>
  logTaskActivity(taskId, user, 'status_changed', previousStatus, newStatus);
export const logTaskPriorityChanged = (taskId: string, user: User, previousPriority?: string, newPriority?: string) =>
  logTaskActivity(taskId, user, 'priority_changed', previousPriority, newPriority);
export const logTaskDeadlineChanged = (taskId: string, user: User, previousDeadline?: string, newDeadline?: string) =>
  logTaskActivity(taskId, user, 'deadline_changed', previousDeadline, newDeadline);
export const logTaskCompleted = (taskId: string, user: User) => logTaskActivity(taskId, user, 'completed');

export const getRecentTaskActivities = (firmId: string, limit = 50) =>
  taskActivityWorkflowService.getRecentTaskActivities(firmId, limit);
