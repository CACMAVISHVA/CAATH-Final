import { NotificationCreateInput, NotificationRecord } from '../types';

export interface INotificationRepository {
  create(input: NotificationCreateInput): Promise<NotificationRecord>;
  markDelivered(notificationId: string): Promise<void>;
  markFailed(notificationId: string, reason: string): Promise<void>;
  listByRecipient(tenantId: string, recipientUserId: string, limit?: number): Promise<NotificationRecord[]>;
}

export class NotificationRepository implements INotificationRepository {
  async create(input: NotificationCreateInput): Promise<NotificationRecord> {
    return {
      id: `notif_${Date.now()}`,
      tenantId: input.tenantId,
      actorId: input.actorId,
      recipientUserId: input.recipientUserId,
      title: input.title,
      message: input.message,
      type: input.type,
      channel: input.channel || 'in_app',
      priority: input.priority || 'normal',
      status: 'pending',
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };
  }

  async markDelivered(_notificationId: string): Promise<void> {}
  async markFailed(_notificationId: string, _reason: string): Promise<void> {}
  async listByRecipient(_tenantId: string, _recipientUserId: string, _limit = 50): Promise<NotificationRecord[]> {
    return [];
  }
}
