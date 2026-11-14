/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';
import { runtimeEventService, runtimeObservabilityService } from '../runtime/production';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationRow = {
  id: string;
  firm_id: string | null;
  recipient_user_id: string | null;
  audience_role: string | null;
  title: string;
  message: string;
  status: NotificationStatus;
  priority?: NotificationPriority | null;
  action_url?: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationInput = {
  firmId?: string;
  recipientUserId?: string;
  audienceRole?: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  user?: User;
};

const pendingNotificationCreates = new Map<string, Promise<{ id: string } | null>>();

export const createNotification = async ({
  firmId,
  recipientUserId,
  audienceRole,
  title,
  message,
  priority,
  actionUrl,
  user,
}: NotificationInput) => {
  firmId ??= user?.firmId;
  const idempotencyKey = JSON.stringify([
    firmId || null,
    recipientUserId || null,
    audienceRole || null,
    title,
    message,
    actionUrl || null,
  ]);
  const pendingCreate = pendingNotificationCreates.get(idempotencyKey);
  if (pendingCreate) return pendingCreate;

  const createOperation = (async (): Promise<{ id: string } | null> => {
  // Runtime producers can be retried or mounted more than once. Reuse an
  // equivalent recent alert so a retry does not flood the same recipient.
  // The in-flight map above also closes the race where two callers perform
  // the duplicate lookup before either insert has completed.
  const recentCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let duplicateQuery = supabase
    .from('notifications')
    .select('id')
    .eq('title', title)
    .eq('message', message)
    .neq('status', 'ARCHIVED')
    .gte('created_at', recentCutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  duplicateQuery = firmId
    ? duplicateQuery.eq('firm_id', firmId)
    : duplicateQuery.is('firm_id', null);
  duplicateQuery = recipientUserId
    ? duplicateQuery.eq('recipient_user_id', recipientUserId)
    : duplicateQuery.is('recipient_user_id', null);
  duplicateQuery = audienceRole
    ? duplicateQuery.eq('audience_role', audienceRole)
    : duplicateQuery.is('audience_role', null);

  const { data: existingRows, error: duplicateError } = await duplicateQuery;
  if (duplicateError) throw duplicateError;
  if (existingRows?.[0]?.id) return existingRows[0];

  const notificationId = crypto.randomUUID();
  const { error } = await supabase
    .from('notifications')
    .insert([{
      id: notificationId,
      firm_id: firmId || null,
      recipient_user_id: recipientUserId || null,
      audience_role: audienceRole || null,
      title,
      message,
      status: 'UNREAD',
      priority: priority || 'MEDIUM',
      action_url: actionUrl || null,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    }]);
  const data = { id: notificationId };

  if (error) throw error;
  if (data?.id) {
    const tenantId = firmId || 'global';
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await runtimeEventService.emit(
        'runtime.notification.persisted',
        { notificationId: data.id, audienceRole: audienceRole || null, recipientUserId: recipientUserId || null, priority: priority || 'MEDIUM' },
        tenantId,
        correlationId,
      );
    } catch (runtimeEventError) {
      // The notification is already durable at this point. Observability must not
      // turn a successful user action into a false failure or invite duplicates.
      console.warn('Notification persisted but runtime telemetry failed:', runtimeEventError);
    }
    runtimeObservabilityService.metric('runtime.notifications.persisted', 1, { priority: priority || 'MEDIUM' }, tenantId);
  }
  return data;
  })();

  pendingNotificationCreates.set(idempotencyKey, createOperation);
  try {
    return await createOperation;
  } finally {
    pendingNotificationCreates.delete(idempotencyKey);
  }
};

export const markAsUnread = async (notificationId: string, userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({
      status: 'UNREAD',
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
  if (error) throw error;
};

export const notifyDocumentExpiry = async (firmId: string, recipientUserId: string, documentName: string, user?: User) =>
  createNotification({
    firmId,
    recipientUserId,
    title: 'Document Expiry Alert',
    message: `${documentName} is approaching expiry.`,
    priority: 'HIGH',
    user,
  });

export const notifyComplianceWarning = async (firmId: string, recipientUserId: string, message: string, user?: User) =>
  createNotification({
    firmId,
    recipientUserId,
    title: 'Compliance Warning',
    message,
    priority: 'HIGH',
    user,
  });

export const notifyPaymentAlert = async (firmId: string, recipientUserId: string, message: string, user?: User) =>
  createNotification({
    firmId,
    recipientUserId,
    title: 'Payment Alert',
    message,
    priority: 'MEDIUM',
    user,
  });

export const markAsRead = async (notificationId: string, userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({
      status: 'READ',
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) throw error;
};

export const markAllAsRead = async (userId: string, firmId?: string) => {
  let query = supabase
    .from('notifications')
    .update({
      status: 'READ',
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('recipient_user_id', userId)
    .eq('status', 'UNREAD');

  if (firmId) {
    query = query.eq('firm_id', firmId);
  }

  const { error } = await query;
  if (error) throw error;
};

export const archiveNotification = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ status: 'ARCHIVED' })
    .eq('id', notificationId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Notification could not be archived or is outside your permitted workspace.');
};

export const getMyNotifications = async (userId: string, firmId?: string) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_user_id', userId)
    .neq('status', 'ARCHIVED')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as NotificationRow[];
};

export const getUnreadCount = async (userId: string, firmId?: string, role?: string): Promise<number> => {
  let query = supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .neq('status', 'ARCHIVED')
    .eq('status', 'UNREAD');

  if (role) {
    const roleFilter = role === 'SuperAdmin' ? 'audience_role.in.(SuperAdmin,Admin)' : `audience_role.eq.${role}`;
    query = query.or(`recipient_user_id.eq.${userId},${roleFilter}`);
  } else {
    query = query.eq('recipient_user_id', userId);
  }

  if (firmId) {
    query = query.eq('firm_id', firmId);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
};

export const getMyAndRoleNotifications = async (userId: string, role?: string, firmId?: string) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .neq('status', 'ARCHIVED');

  if (role) {
    const roleFilter = role === 'SuperAdmin' ? 'audience_role.in.(SuperAdmin,Admin)' : `audience_role.eq.${role}`;
    query = query.or(`recipient_user_id.eq.${userId},${roleFilter}`);
  } else {
    query = query.eq('recipient_user_id', userId);
  }

  if (firmId) {
    query = query.eq('firm_id', firmId);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data || []) as NotificationRow[];
};

export const getFirmNotifications = async (firmId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('firm_id', firmId)
    .neq('status', 'ARCHIVED')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as NotificationRow[];
};

export const notifyNewTask = async (
  taskId: string,
  taskTitle: string,
  assignedUserId: string,
  firmId: string,
  assignerName: string
) => {
  return createNotification({
    firmId,
    recipientUserId: assignedUserId,
    title: 'New Task Assigned',
    message: `You have been assigned a new task: "${taskTitle}" by ${assignerName}.`,
  });
};

export const notifyTaskOverdue = async (
  taskId: string,
  taskTitle: string,
  assignedUserId: string,
  firmId: string
) => {
  return createNotification({
    firmId,
    recipientUserId: assignedUserId,
    title: 'Task Overdue',
    message: `Task "${taskTitle}" is now overdue. Please complete it as soon as possible.`,
  });
};

export const notifyApprovalRequired = async (
  approvalId: string,
  taskTitle: string,
  approverRole: string,
  firmId: string,
  requesterName: string
) => {
  return createNotification({
    firmId,
    audienceRole: approverRole,
    title: 'Approval Required',
    message: `${requesterName} has submitted "${taskTitle}" for your approval.`,
  });
};

export const notifyApprovalComplete = async (
  approvalId: string,
  taskTitle: string,
  status: 'APPROVED' | 'REJECTED',
  recipientUserId: string,
  firmId: string,
  approverName: string
) => {
  const statusText = status === 'APPROVED' ? 'approved' : 'rejected';
  return createNotification({
    firmId,
    recipientUserId,
    title: `Approval ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
    message: `Your submission "${taskTitle}" has been ${statusText} by ${approverName}.`,
  });
};

export const notifyClientDocument = async (
  clientId: string,
  clientName: string,
  firmId: string,
  adminIds: string[]
) => {
  for (const adminId of adminIds) {
    await createNotification({
      firmId,
      recipientUserId: adminId,
      title: 'New Client Document',
      message: `${clientName} has uploaded a new document. Please review it.`,
    });
  }
};
