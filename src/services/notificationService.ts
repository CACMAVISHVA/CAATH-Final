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
  user?: User;
};

export const createNotification = async ({
  firmId,
  recipientUserId,
  audienceRole,
  title,
  message,
  priority,
  user,
}: NotificationInput) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      firm_id: firmId || null,
      recipient_user_id: recipientUserId || null,
      audience_role: audienceRole || null,
      title,
      message,
      status: 'UNREAD',
      priority: priority || 'MEDIUM',
      created_by: user?.id || null,
      updated_by: user?.id || null,
    }])
    .select('id')
    .single();

  if (error) throw error;
  if (data?.id) {
    const tenantId = firmId || 'global';
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await runtimeEventService.emit(
      'runtime.notification.persisted',
      { notificationId: data.id, audienceRole: audienceRole || null, recipientUserId: recipientUserId || null, priority: priority || 'MEDIUM' },
      tenantId,
      correlationId,
    );
    runtimeObservabilityService.metric('runtime.notifications.persisted', 1, { priority: priority || 'MEDIUM' }, tenantId);
  }
  return data;
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
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'ARCHIVED' })
    .eq('id', notificationId);

  if (error) throw error;
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
    query = query.or(`recipient_user_id.eq.${userId},audience_role.eq.${role}`);
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
    query = query.or(`recipient_user_id.eq.${userId},audience_role.eq.${role}`);
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
