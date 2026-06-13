export type NotificationChannel = 'in_app' | 'email' | 'push' | 'websocket';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationRecord {
  id: string;
  tenantId: string;
  actorId?: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: 'pending' | 'queued' | 'delivered' | 'failed' | 'read';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationCreateInput {
  tenantId: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: string;
  actorId?: string;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  success: boolean;
  reason?: string;
}
