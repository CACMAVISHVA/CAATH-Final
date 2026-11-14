/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateNoticeInput, deadlineBand } from '../noticeIntelligence';
import { supabase } from '../../../lib/supabase';
import { User } from '../../../types';
import { emitDomainEvent } from '../../sharedEventEmitter';
import { createTask, getTasks, reassignTask, TaskCategory, TaskRow, TaskStatus, updateTaskStatus } from '../../tasks/services/taskDomainService';
import { createNotification, notifyNewTask } from '../../../services/notificationService';
import { logEnterpriseActivity } from '../../../services/observabilityService';
import { assertWorkflowTransition, mapNoticeToStandardState, mapTaskToStandardState } from '../../../services/workflowEngineService';
import { publishEnterpriseEvent } from '../../../services/enterpriseEventBusService';
import { noticeRepository } from '../repositories/NoticeRepository';
import { unwrapData } from '../../../infrastructure/repositories/baseRepository';

export type NoticeStatus = 'Received' | 'Assigned' | 'Drafting' | 'Drafted' | 'Under_Review' | 'Escalated' | 'Reassigned' | 'Filed' | 'Closed' | 'Archived';
export type NoticeSource = 'Income Tax' | 'GST' | 'MCA' | 'Other';

export type NoticeRow = {
  id: string;
  firm_id: string;
  client_id: string;
  notice_number: string | null;
  source: NoticeSource;
  description: string | null;
  received_date: string;
  deadline: string | null;
  status: NoticeStatus;
  assigned_to: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NoticeInput = {
  firmId: string;
  clientId: string;
  noticeNumber?: string;
  source: NoticeSource;
  description?: string;
  receivedDate: string;
  deadline?: string;
  assignedTo?: string;
  user: User;
  requestId?: string;
};

export interface NoticeWorkflowSignal {
  noticeId: string;
  noticeNumber: string | null;
  noticeStatus: NoticeStatus;
  taskId: string | null;
  taskStatus: TaskStatus | null;
  invoiceRecommendation: boolean;
  receivableRisk: 'low' | 'medium' | 'high';
}

const toTaskCategory = (source: NoticeSource): TaskCategory => source === 'Income Tax' ? 'Income Tax' : source === 'GST' ? 'GST' : source === 'MCA' ? 'ROC' : 'Other';
const buildNoticeTaskTitle = (noticeNumber: string | null | undefined, source: NoticeSource) => `Notice Response ${noticeNumber ? `(${noticeNumber})` : ''} - ${source}`.trim();
const buildNoticeTaskMarker = (noticeId: string) => `[NOTICE_WORKFLOW:${noticeId}]`;

const extractNoticeMarker = (description: string | null) => {
  if (!description) return null;
  const match = description.match(/\[NOTICE_WORKFLOW:([a-f0-9-]+)\]/i);
  return match?.[1] || null;
};

const mapNoticeStatusToTaskStatus = (status: NoticeStatus): TaskStatus => {
  switch (status) {
    case 'Received': return 'Created';
    case 'Assigned': return 'Assigned';
    case 'Drafting': return 'In Progress';
    case 'Drafted':
    case 'Under_Review': return 'Under Review';
    case 'Escalated': return 'Escalated';
    case 'Reassigned': return 'Reassigned';
    case 'Filed': return 'Completed';
    case 'Closed':
    case 'Archived': return 'Archived';
    default: return 'Created';
  }
};

const writeNoticeAudit = async (params: { firmId: string; user: User; action: string; noticeId: string; details: string }) => {
  await unwrapData(noticeRepository.insertAuditLog({
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: 'Notice',
    entity_id: params.noticeId,
    details: params.details,
  }) as any);
};

const getNoticeLinkedTask = async (firmId: string, noticeId: string): Promise<TaskRow | null> => {
  const marker = buildNoticeTaskMarker(noticeId);
  const tasks = await getTasks(firmId);
  return tasks.find((item) => (item.description || '').includes(marker)) || null;
};

export const createNotice = async ({ firmId, clientId, noticeNumber, source, description, receivedDate, deadline, assignedTo, user, requestId }: NoticeInput): Promise<{ id: string }> => {
  validateNoticeInput({ noticeNumber, receivedDate, deadline });
  if (user.firmId !== firmId || !['SuperAdmin', 'Admin', 'Staff'].includes(user.role)) throw new Error('Internal workspace access required.');
  if (import.meta.env.VITE_NOTICE_INTELLIGENCE === 'true') {
    const { data: id, error } = await supabase.rpc('create_notice_intelligence', {
      p_client_id: clientId, p_number: noticeNumber!.trim(), p_source: source,
      p_received: receivedDate, p_deadline: deadline, p_description: description || null,
      p_assigned_to: assignedTo || null, p_request_id: requestId || crypto.randomUUID(),
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  }
  const data = await unwrapData(noticeRepository.createNotice({
    firm_id: firmId,
    client_id: clientId,
    notice_number: noticeNumber || null,
    source,
    received_date: receivedDate,
    deadline: deadline || null,
    status: 'Received',
    assigned_to: assignedTo || null,
    created_by: user.id,
    updated_by: user.id,
  }) as any);

  const noticeId = (data as any).id as string;
  const taskTitle = buildNoticeTaskTitle(noticeNumber, source);
  const taskDescription = `${description || 'Compliance notice workflow initiated.'}\n${buildNoticeTaskMarker(noticeId)}`;

  const createdTask = await createTask({
    firmId,
    clientId,
    assignedTo: assignedTo || undefined,
    title: taskTitle,
    description: taskDescription,
    priority: 'High',
    status: assignedTo ? 'Assigned' : 'Created',
    category: toTaskCategory(source),
    deadline: deadline || undefined,
    user,
  });

  await writeNoticeAudit({ firmId, user, action: 'Notice Workflow Created', noticeId, details: `Notice created and operationalized as task ${(createdTask as any).id}.` });

  if (assignedTo) {
    await notifyNewTask((createdTask as any).id, taskTitle, assignedTo, firmId, user.name);
  } else {
    await createNotification({ firmId, audienceRole: 'Admin', title: 'Notice Workflow Requires Assignment', message: `Notice ${noticeNumber || noticeId.slice(0, 8)} has been converted to a task and needs assignment.`, priority: 'HIGH', user });
  }

  try {
    await emitDomainEvent('NOTICE_RECEIVED', { noticeId, taskId: (createdTask as any).id, source, status: 'Received' }, firmId, user.id);
    await publishEnterpriseEvent({ eventName: 'notice_created', firmId, sourceService: 'noticeService.createNotice', actor: { id: user.id, name: user.name, role: user.role }, workflowType: 'notices', workflowId: noticeId, payload: { linkedTaskId: (createdTask as any).id, source, status: 'Received', assignedTo: assignedTo || null } });
  } catch {}

  return data as { id: string };
};

export const updateNotice = async (noticeId: string, updates: Partial<NoticeRow>, user: User) => {
  await unwrapData(noticeRepository.updateNotice(noticeId, { ...updates, updated_by: user.id, updated_at: new Date().toISOString() }) as any);
};

export const assignNotice = async (noticeId: string, assignedTo: string, user: User) => {
  const before = await unwrapData(noticeRepository.getNoticeStatus(noticeId) as any);
  const previousStatus = ((before as any)?.status || 'Received') as NoticeStatus;
  assertWorkflowTransition('notice', previousStatus, 'Assigned', user.role);

  await unwrapData(noticeRepository.updateNotice(noticeId, { assigned_to: assignedTo, status: 'Assigned', updated_by: user.id, updated_at: new Date().toISOString() }) as any);

  if (user.firmId) {
    const linkedTask = await getNoticeLinkedTask(user.firmId, noticeId);
    if (linkedTask) await reassignTask(linkedTask.id, assignedTo, user, 'Notice ownership updated');
  }
};

export const updateNoticeStatus = async (noticeId: string, status: NoticeStatus, user: User) => {
  const before = await unwrapData(noticeRepository.getNoticeStatus(noticeId) as any);
  const previousStatus = ((before as any)?.status || 'Received') as NoticeStatus;
  assertWorkflowTransition('notice', previousStatus, status, user.role);

  await unwrapData(noticeRepository.updateNotice(noticeId, { status, updated_by: user.id, updated_at: new Date().toISOString() }) as any);

  if (user.firmId) {
    const linkedTask = await getNoticeLinkedTask(user.firmId, noticeId);
    if (linkedTask) await updateTaskStatus(linkedTask.id, mapNoticeStatusToTaskStatus(status), user);

    try {
      if (status === 'Escalated') await emitDomainEvent('NOTICE_ESCALATED', { noticeId, previousStatus, status }, user.firmId, user.id);
      await logEnterpriseActivity({ firm_id: user.firmId, event_type: 'workflow_transition', event_subtype: 'notice_lifecycle', reference_id: noticeId, reference_table: 'notices', actor_id: user.id, actor_name: user.name, actor_role: user.role, details: { from: previousStatus, to: status, fromStandard: mapNoticeToStandardState(previousStatus), toStandard: mapNoticeToStandardState(status), linkedTaskId: linkedTask?.id || null, linkedTaskState: linkedTask ? mapTaskToStandardState(linkedTask.status) : null }, severity: status === 'Escalated' ? 'warning' : 'info' } as any);
    } catch {}
  }
};

export const deleteNotice = async (noticeId: string) => {
  await unwrapData(noticeRepository.deleteNotice(noticeId) as any);
};

export const getNotices = async (firmId: string) => {
  const data = await unwrapData(noticeRepository.listNoticesByFirm(firmId) as any);
  return data as (NoticeRow & { clients?: { name: string } })[];
};

export const getNoticeById = async (noticeId: string) => {
  const data = await unwrapData(noticeRepository.getNoticeById(noticeId) as any);
  return data as NoticeRow & { clients?: { name: string } };
};

export const getNoticeStats = async (firmId: string) => {
  const notices = ((await unwrapData(noticeRepository.listNoticeStatsRows(firmId) as any)) || []) as Array<{ status: NoticeStatus; deadline: string | null }>;
  const counts = {
    new: notices.filter((n: any) => n.status === 'Received').length,
    drafting: notices.filter((n: any) => ['Assigned', 'Drafting', 'Drafted', 'Under_Review', 'Escalated', 'Reassigned'].includes(n.status)).length,
    upcoming: 0,
    closed: notices.filter((n: any) => ['Closed', 'Archived'].includes(n.status)).length,
  };

  counts.upcoming = notices.filter(n => ['Due today', 'Due soon'].includes(deadlineBand(n.deadline, n.status))).length;
  return counts;
};

export const getNoticeWorkflowSignals = async (firmId: string): Promise<NoticeWorkflowSignal[]> => {
  const [notices, tasks] = await Promise.all([getNotices(firmId), getTasks(firmId)]);

  const noticeTaskMap = new Map<string, TaskRow>();
  tasks.forEach((task) => {
    const marker = extractNoticeMarker(task.description || null);
    if (marker) noticeTaskMap.set(marker, task);
  });

  return notices.map((notice) => {
    const linkedTask = noticeTaskMap.get(notice.id) || null;
    const unresolved = !['Filed', 'Closed', 'Archived'].includes(notice.status);
    const receivableRisk: 'low' | 'medium' | 'high' = unresolved && notice.deadline && new Date(notice.deadline) < new Date() ? 'high' : unresolved ? 'medium' : 'low';

    return {
      noticeId: notice.id,
      noticeNumber: notice.notice_number || null,
      noticeStatus: notice.status,
      taskId: linkedTask?.id || null,
      taskStatus: linkedTask?.status || null,
      invoiceRecommendation: notice.status === 'Filed' || notice.status === 'Closed',
      receivableRisk,
    };
  });
};

export const getStaffMembers = async (firmId: string) => {
  return ((await unwrapData(noticeRepository.listActiveNoticeStaff(firmId) as any)) || []) as Array<{ id: string; name: string; email: string }>;
};
