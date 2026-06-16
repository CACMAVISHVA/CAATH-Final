/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from '../../../types';
import { emitDomainEvent } from '../../sharedEventEmitter';
import { logTaskReassigned, logTaskStatusChanged } from '../../../services/taskActivityService';
import { logEnterpriseActivity } from '../../../services/observabilityService';
import { assertWorkflowTransition, mapTaskToStandardState } from '../../../services/workflowEngineService';
import { publishEnterpriseEvent } from '../../../services/enterpriseEventBusService';
import { registerOrchestrationChain } from '../../../services/enterpriseOrchestrationService';
import { taskRepository, UserRoleRow } from '../repositories/TaskRepository';
import { unwrapData, unwrapOptional } from '../../../infrastructure/repositories/baseRepository';
import { createRuntimeNotification } from '../../../services/notificationRuntimeService';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus =
  | 'Created'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Under Review'
  | 'Escalated'
  | 'Reassigned'
  | 'Completed'
  | 'Archived'
  | 'Todo'
  | 'Review';
export type TaskCategory = 'GST' | 'Income Tax' | 'Audit' | 'ROC' | 'MCA' | 'TDS' | 'Other';

export type TaskInput = {
  firmId: string;
  clientId?: string;
  assignedTo?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  category?: TaskCategory;
  portalType?: string;
  portalWorkflowType?: string;
  deadline?: string;
  user: User;
};

export type TaskRow = {
  id: string;
  firm_id: string;
  client_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: string | null;
  portal_type?: string | null;
  portal_workflow_type?: string | null;
  deadline: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskReassignmentHistory = {
  id: string;
  task_id: string;
  firm_id: string;
  previous_assignee: string | null;
  previous_assignee_name: string | null;
  new_assignee: string | null;
  new_assignee_name: string | null;
  reassigned_by: string;
  reassigned_by_name: string;
  reason: string | null;
  created_at: string;
};

const writeAuditLog = async (params: {
  firmId: string;
  user: User;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
}) => {
  await unwrapData(taskRepository.insertAuditLog({
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
  }) as any);
};

const assertFirmScope = (user: User, firmId: string) => {
  if (user.role !== 'GodAdmin' && user.firmId !== firmId) {
    throw new Error('Cross-workspace operations are not allowed.');
  }
};

const getUserRoleInFirm = async (userId: string, firmId: string): Promise<UserRoleRow | null> => {
  return unwrapOptional(taskRepository.getUserRoleInFirm(userId, firmId) as any);
};

const assertCanDelegateToRole = (actorRole: UserRole, assigneeRole: UserRole) => {
  if (actorRole === 'SuperAdmin') return;
  if (actorRole === 'Admin') {
    if (assigneeRole !== 'Staff') throw new Error('Admin can delegate only to Staff.');
    return;
  }
  if (actorRole === 'Staff') throw new Error('Staff cannot delegate or reassign ownership.');
  if (actorRole !== 'GodAdmin') throw new Error('Delegation is not allowed for this role.');
};

export const createTask = async ({ firmId, clientId, assignedTo, title, description, priority = 'Medium', status, category, portalType, portalWorkflowType, deadline, user }: TaskInput) => {
  if (!user.firmId) throw new Error('A firm workspace is required to create tasks.');
  assertFirmScope(user, firmId);

  if (assignedTo) {
    const assignee = await getUserRoleInFirm(assignedTo, firmId);
    if (!assignee) throw new Error('Assignee is not in the same enterprise workspace.');
    assertCanDelegateToRole(user.role, assignee.role);
  }

  const effectiveStatus: TaskStatus = status || (assignedTo ? 'Assigned' : 'Created');
  const data = await unwrapData(taskRepository.createTask({
    firm_id: firmId,
    client_id: clientId,
    assigned_to: assignedTo,
    title,
    description,
    priority,
    status: effectiveStatus,
    category,
    portal_type: portalType || null,
    portal_workflow_type: portalWorkflowType || null,
    deadline: deadline ? new Date(deadline).toISOString() : null,
    created_by: user.id,
    updated_by: user.id,
  }) as any);

  await writeAuditLog({ firmId, user, action: 'Task Created', entityType: 'Task', entityId: (data as any).id, details: `Task "${title}" created${assignedTo ? ` and assigned` : ''}.` });

  try {
    await emitDomainEvent(assignedTo ? 'TASK_ASSIGNED' : 'WORKFLOW_TRIGGERED', { taskId: (data as any).id, status: effectiveStatus, priority, category: category || null }, firmId, user.id);
    await logEnterpriseActivity({ firm_id: firmId, event_type: 'task', event_subtype: 'created', reference_id: (data as any).id, reference_table: 'tasks', actor_id: user.id, actor_name: user.name, actor_role: user.role, details: { title, assignedTo }, severity: 'info' } as any);
    await publishEnterpriseEvent({ eventName: assignedTo ? 'task_assigned' : 'workflow_transitioned', firmId, sourceService: 'taskService.createTask', actor: { id: user.id, name: user.name, role: user.role }, workflowType: 'tasks', workflowId: (data as any).id, payload: { status: effectiveStatus, priority, category: category || null } });
  } catch {}

  if (assignedTo) {
    await createRuntimeNotification({
      firmId,
      recipientUserId: assignedTo,
      eventType: 'task_assigned',
      title: 'Task assigned',
      message: `${user.name} assigned "${title}" to you.`,
      priority: priority === 'Urgent' ? 'HIGH' : 'MEDIUM',
      user,
    });
  }

  return data;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');

  const before = await unwrapData(taskRepository.getTaskById(taskId) as any);
  const currentStatus = ((before as any)?.status || 'Created') as TaskStatus;
  assertWorkflowTransition('task', currentStatus, status, user.role);

  await unwrapData(taskRepository.updateTask(taskId, user.firmId, { status, updated_by: user.id, updated_at: new Date().toISOString() }) as any);

  await logTaskStatusChanged(taskId, user, currentStatus, status);
  await writeAuditLog({ firmId: user.firmId, user, action: 'Task Status Changed', entityType: 'Task', entityId: taskId, details: `Task "${(before as any)?.title || taskId}" status changed from ${currentStatus} to ${status}.` });

  try {
    await emitDomainEvent(status === 'Completed' ? 'TASK_COMPLETED' : 'WORKFLOW_TRIGGERED', { taskId, from: currentStatus, to: status }, user.firmId, user.id);
    await logEnterpriseActivity({ firm_id: user.firmId, event_type: 'workflow_transition', event_subtype: 'task_lifecycle', reference_id: taskId, reference_table: 'tasks', actor_id: user.id, actor_name: user.name, actor_role: user.role, details: { from: currentStatus, to: status, fromStandard: mapTaskToStandardState(currentStatus), toStandard: mapTaskToStandardState(status) }, severity: status === 'Escalated' ? 'warning' : 'info' } as any);
    await publishEnterpriseEvent({ eventName: status === 'Completed' ? 'task_completed' : status === 'Escalated' ? 'workflow_escalated' : 'workflow_transitioned', firmId: user.firmId, sourceService: 'taskService.updateTaskStatus', actor: { id: user.id, name: user.name, role: user.role }, workflowType: 'tasks', workflowId: taskId, payload: { from: currentStatus, to: status, fromStandard: mapTaskToStandardState(currentStatus), toStandard: mapTaskToStandardState(status) } });
    if (status === 'Completed') await registerOrchestrationChain({ firmId: user.firmId, actor: user, chainType: 'task_to_revenue', entityType: 'tasks', entityId: taskId, governanceRequired: true });
  } catch {}

  if (status === 'Completed' || status === 'Escalated') {
    await createRuntimeNotification({
      firmId: user.firmId,
      recipientUserId: (before as any)?.assigned_to || undefined,
      audienceRole: (before as any)?.assigned_to ? undefined : 'Admin',
      eventType: status === 'Completed' ? 'task_completed' : 'escalation_triggered',
      title: status === 'Completed' ? 'Task completed' : 'Task escalated',
      message: `"${(before as any)?.title || taskId}" moved from ${currentStatus} to ${status}.`,
      priority: status === 'Completed' ? 'LOW' : 'CRITICAL',
      user,
    });
  }
};

export const reassignTask = async (taskId: string, newAssigneeId: string | null, user: User, reason?: string) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const firmId = user.firmId;
  if (!['Admin', 'SuperAdmin', 'GodAdmin'].includes(user.role)) throw new Error('Only governance roles are allowed to reassign tasks.');

  const before = await unwrapData(taskRepository.getTaskById(taskId) as any);
  const previousAssignee = (before as any)?.assigned_to || null;
  const newAssignee = newAssigneeId || null;

  if (newAssignee) {
    const assignee = await getUserRoleInFirm(newAssignee, firmId);
    if (!assignee) throw new Error('Assignee is not in the same enterprise workspace.');
    assertCanDelegateToRole(user.role, assignee.role);
  }

  await unwrapData(taskRepository.updateTask(taskId, firmId, { assigned_to: newAssignee, status: 'Reassigned', updated_by: user.id, updated_at: new Date().toISOString() }) as any);

  await logTaskReassigned(taskId, user, previousAssignee || undefined, newAssignee || undefined);
  await logReassignmentRecord(taskId, firmId, previousAssignee, null, newAssignee, null, reason || null, user);
  await writeAuditLog({ firmId, user, action: 'Task Reassigned', entityType: 'Task', entityId: taskId, details: `Task "${(before as any)?.title || taskId}" reassigned from ${previousAssignee || 'unassigned'} to ${newAssignee || 'unassigned'}${reason ? `; reason: ${reason}` : ''}` });

  try {
    await emitDomainEvent('TASK_ASSIGNED', { taskId, previousAssignee, newAssignee, reason: reason || null }, firmId, user.id);
  } catch {}

  if (newAssignee) {
    await createRuntimeNotification({
      firmId,
      recipientUserId: newAssignee,
      eventType: 'task_assigned',
      title: 'Task reassigned',
      message: `"${(before as any)?.title || taskId}" was reassigned to you${reason ? `: ${reason}` : '.'}`,
      priority: 'HIGH',
      user,
    });
  }
};

export const bulkReassignTasks = async (taskIds: string[], newAssigneeId: string | null, reason: string | undefined, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const firmId = user.firmId;
  if (!['Admin', 'SuperAdmin', 'GodAdmin'].includes(user.role)) throw new Error('Only governance roles can perform bulk reassignments.');

  if (newAssigneeId) {
    const assignee = await getUserRoleInFirm(newAssigneeId, firmId);
    if (!assignee) throw new Error('Assignee is not in the same enterprise workspace.');
    assertCanDelegateToRole(user.role, assignee.role);
  }

  const tasks = await unwrapData(taskRepository.listTaskAssignments(taskIds, firmId) as any);
  await unwrapData(taskRepository.bulkUpdateTasks(taskIds, firmId, { assigned_to: newAssigneeId, status: 'Reassigned', updated_by: user.id, updated_at: new Date().toISOString() }) as any);

  await Promise.all((tasks as any[]).map((task) => Promise.all([
    logTaskReassigned(task.id, user, task.assigned_to || undefined, newAssigneeId || undefined),
    logReassignmentRecord(task.id, firmId, task.assigned_to || null, null, newAssigneeId, null, reason || null, user),
  ])));

  await writeAuditLog({ firmId, user, action: 'Bulk Task Reassigned', entityType: 'Task', details: `${(tasks as any[])?.length || 0} tasks reassigned to ${newAssigneeId || 'unassigned'}${reason ? `; reason: ${reason}` : ''}` });
};

export const updateTask = async (taskId: string, updates: Partial<{ title: string; description: string; priority: TaskPriority; category: string; deadline: string; client_id: string }>, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const updateData: Record<string, unknown> = { ...updates, updated_by: user.id, updated_at: new Date().toISOString() };
  if (updates.deadline) updateData.deadline = new Date(updates.deadline).toISOString();
  await unwrapData(taskRepository.updateTask(taskId, user.firmId, updateData) as any);
  await writeAuditLog({ firmId: user.firmId, user, action: 'Task Updated', entityType: 'Task', entityId: taskId, details: 'Task updated.' });
};

export const deleteTask = async (taskId: string, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  await unwrapData(taskRepository.deleteTask(taskId, user.firmId) as any);
  await writeAuditLog({ firmId: user.firmId, user, action: 'Task Deleted', entityType: 'Task', entityId: taskId, details: 'Task deleted.' });
};

export const getTasks = async (firmId: string) => {
  const data = await unwrapData(taskRepository.listTasks(firmId) as any);
  return (data || []) as TaskRow[];
};

const logReassignmentRecord = async (taskId: string, firmId: string, previousAssignee: string | null, previousAssigneeName: string | null, newAssignee: string | null, newAssigneeName: string | null, reason: string | null, user: User) => {
  try {
    await unwrapData(taskRepository.insertReassignmentRecord({ task_id: taskId, firm_id: firmId, previous_assignee: previousAssignee, previous_assignee_name: previousAssigneeName, new_assignee: newAssignee, new_assignee_name: newAssigneeName, reassigned_by: user.id, reassigned_by_name: user.name, reason: reason || null }) as any);
  } catch (error) {
    console.warn('Task reassignment history insert failed:', error);
  }
};

export const getTaskReassignmentHistory = async (taskId: string): Promise<TaskReassignmentHistory[]> => {
  try {
    const data = await unwrapData(taskRepository.getReassignmentHistory(taskId) as any);
    return (data || []) as TaskReassignmentHistory[];
  } catch {
    return [];
  }
};

export const getMyTasks = async (userId: string, firmId: string) => {
  const data = await unwrapData(taskRepository.getMyTasks(userId, firmId) as any);
  return (data || []) as TaskRow[];
};

export const getStaffMembers = async (firmId: string) => {
  const data = await unwrapData(taskRepository.listActiveStaff(firmId) as any);
  return (data || []) as Array<{ id: string; name: string; email: string; role: UserRole }>;
};

export const getAdmins = async (firmId: string) => {
  const tasks = await unwrapData(taskRepository.listOpenAssignments(firmId) as any);
  const taskCounts: Record<string, number> = {};
  (tasks as any[])?.forEach((t) => { if (t.assigned_to) taskCounts[t.assigned_to] = (taskCounts[t.assigned_to] || 0) + 1; });

  const users = (await unwrapData(taskRepository.listActiveUsersByRole(firmId, 'Admin') as any)) as Array<{ id: string; name: string; email: string; role: UserRole }>;
  return users.map((user) => ({ ...user, activeTasks: taskCounts[user.id] || 0 }));
};

export const getStaffMembersOnly = async (firmId: string) => {
  const tasks = await unwrapData(taskRepository.listOpenAssignments(firmId) as any);
  const taskCounts: Record<string, number> = {};
  (tasks as any[])?.forEach((t) => { if (t.assigned_to) taskCounts[t.assigned_to] = (taskCounts[t.assigned_to] || 0) + 1; });

  const users = (await unwrapData(taskRepository.listActiveUsersByRole(firmId, 'Staff') as any)) as Array<{ id: string; name: string; email: string; role: UserRole }>;
  return users.map((user) => ({ ...user, activeTasks: taskCounts[user.id] || 0 }));
};

export const getClients = async (firmId: string) => {
  const data = await unwrapData(taskRepository.listClientsBasic(firmId) as any);
  return (data || []) as Array<{ id: string; name: string }>;
};
