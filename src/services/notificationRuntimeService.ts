import { supabase } from '../lib/supabase';
import { User } from '../types';
import {
  archiveNotification,
  createNotification,
  getMyAndRoleNotifications,
  markAllAsRead,
  markAsRead,
  NotificationPriority,
  NotificationRow,
} from './notificationService';

export type RuntimeNotificationEvent =
  | 'task_assigned'
  | 'task_completed'
  | 'compliance_due'
  | 'compliance_overdue'
  | 'compliance_filed'
  | 'gst_analysis_complete'
  | 'document_uploaded'
  | 'escalation_triggered';

export type RuntimeNotificationInput = {
  firmId: string;
  eventType: RuntimeNotificationEvent;
  title: string;
  message: string;
  priority?: NotificationPriority;
  recipientUserId?: string;
  audienceRole?: string;
  user?: User;
};

export const createRuntimeNotification = async ({
  firmId,
  eventType,
  title,
  message,
  priority = 'MEDIUM',
  recipientUserId,
  audienceRole,
  user,
}: RuntimeNotificationInput) => {
  return createNotification({
    firmId,
    recipientUserId,
    audienceRole,
    title,
    message: `[${eventType}] ${message}`,
    priority,
    user,
  });
};

export const listRuntimeNotifications = async (user: User): Promise<NotificationRow[]> => {
  return getMyAndRoleNotifications(user.id, user.role, user.firmId);
};

export const markRuntimeNotificationRead = async (notificationId: string, user: User) => {
  await markAsRead(notificationId, user.id);
};

export const archiveRuntimeNotification = async (notificationId: string) => {
  await archiveNotification(notificationId);
};

export const markAllRuntimeNotificationsRead = async (user: User) => {
  await markAllAsRead(user.id, user.firmId);
};

export const generateRuntimeNotificationsFromCurrentState = async (user: User): Promise<number> => {
  if (!user.firmId) throw new Error('A firm workspace is required.');

  const [tasks, compliance, documents] = await Promise.all([
    supabase.from('tasks').select('id, title, status, assigned_to, deadline').eq('firm_id', user.firmId),
    supabase.from('compliance_tasks').select('id, name, filing_status, assigned_to, due_date').eq('firm_id', user.firmId),
    supabase.from('document_vault').select('id, name, uploaded_by, created_at').eq('firm_id', user.firmId).order('created_at', { ascending: false }).limit(10),
  ]);

  if (tasks.error) throw tasks.error;
  if (compliance.error) throw compliance.error;
  if (documents.error) throw documents.error;

  let created = 0;
  const now = new Date();

  for (const task of tasks.data || []) {
    if (task.assigned_to && task.status === 'Assigned') {
      await createRuntimeNotification({
        firmId: user.firmId,
        recipientUserId: task.assigned_to,
        eventType: 'task_assigned',
        title: 'Task assigned',
        message: `Task "${task.title}" is assigned and waiting for action.`,
        priority: 'MEDIUM',
        user,
      });
      created += 1;
    }
    if (task.status === 'Completed') {
      await createRuntimeNotification({
        firmId: user.firmId,
        audienceRole: 'Admin',
        eventType: 'task_completed',
        title: 'Task completed',
        message: `Task "${task.title}" has been completed.`,
        priority: 'LOW',
        user,
      });
      created += 1;
    }
  }

  for (const item of compliance.data || []) {
    if (!item.assigned_to || ['Filed', 'Closed'].includes(item.filing_status)) continue;
    const due = new Date(item.due_date);
    if (due < now || due.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000) {
      await createRuntimeNotification({
        firmId: user.firmId,
        recipientUserId: item.assigned_to,
        eventType: due < now ? 'compliance_overdue' : 'compliance_due',
        title: due < now ? 'Compliance overdue' : 'Compliance due soon',
        message: `${item.name} is due on ${item.due_date}.`,
        priority: due < now ? 'CRITICAL' : 'HIGH',
        user,
      });
      created += 1;
    }
  }

  for (const doc of documents.data || []) {
    await createRuntimeNotification({
      firmId: user.firmId,
      audienceRole: 'Admin',
      eventType: 'document_uploaded',
      title: 'Document uploaded',
      message: `${doc.name} was uploaded and is ready for review.`,
      priority: 'MEDIUM',
      user,
    });
    created += 1;
  }

  return created;
};
