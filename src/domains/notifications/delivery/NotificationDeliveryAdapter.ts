import { NotificationDeliveryResult, NotificationRecord } from '../types';

export interface NotificationDeliveryAdapter {
  deliver(notification: NotificationRecord): Promise<NotificationDeliveryResult>;
}

export class InAppNotificationDeliveryAdapter implements NotificationDeliveryAdapter {
  async deliver(notification: NotificationRecord): Promise<NotificationDeliveryResult> {
    return {
      notificationId: notification.id,
      channel: notification.channel,
      success: true,
    };
  }
}

