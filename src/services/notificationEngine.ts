import { NotificationRow, getMyAndRoleNotifications } from './notificationService';
import { UserRole } from '../types';

export type NotificationCategory =
  | 'tasks'
  | 'compliance'
  | 'billing'
  | 'approvals'
  | 'subscriptions'
  | 'gst'
  | 'general';

export type EnterpriseNotification = NotificationRow & {
  category: NotificationCategory;
};

const classify = (notification: NotificationRow): NotificationCategory => {
  const value = `${notification.title} ${notification.message}`.toLowerCase();
  if (value.includes('task')) return 'tasks';
  if (value.includes('approval')) return 'approvals';
  if (value.includes('invoice') || value.includes('payment')) return 'billing';
  if (value.includes('subscription')) return 'subscriptions';
  if (value.includes('gst') || value.includes('mismatch')) return 'gst';
  if (value.includes('filing') || value.includes('compliance')) return 'compliance';
  return 'general';
};

const visibleToRole = (notification: NotificationRow, role?: UserRole) =>
  !notification.audience_role || !role || notification.audience_role === role;

export const getEnterpriseNotifications = async ({
  userId,
  firmId,
  role,
}: {
  userId: string;
  firmId?: string;
  role?: UserRole;
}) => {
  const notifications = await getMyAndRoleNotifications(userId, role, firmId);
  return notifications
    .filter((notification) => visibleToRole(notification, role))
    .map((notification) => ({
      ...notification,
      category: classify(notification),
    })) as EnterpriseNotification[];
};
