export type NotificationEventName =
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_QUEUED'
  | 'NOTIFICATION_DELIVERED'
  | 'NOTIFICATION_FAILED';

export interface NotificationEventPayload {
  tenantId: string;
  notificationId: string;
  recipientUserId: string;
  channel: string;
  priority: string;
  traceId?: string;
}

