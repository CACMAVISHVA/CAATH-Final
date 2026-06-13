import { emitDomainEvent } from '../../sharedEventEmitter';
import { NotificationCreateInput, NotificationRecord } from '../types';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { notificationPolicyEngine } from '../policies/NotificationPolicyEngine';
import { InAppNotificationDeliveryAdapter } from '../delivery/NotificationDeliveryAdapter';

export class NotificationOrchestrator {
  constructor(
    private readonly repository = new NotificationRepository(),
    private readonly delivery = new InAppNotificationDeliveryAdapter(),
  ) {}

  async notify(input: NotificationCreateInput, actorRole = 'System'): Promise<NotificationRecord> {
    const channel = notificationPolicyEngine.resolveChannel({
      tenantId: input.tenantId,
      actorRole,
      notificationType: input.type,
      priority: input.priority || 'normal',
    });

    const notification = await this.repository.create({ ...input, channel });
    await emitDomainEvent('NOTIFICATION_SENT', { notificationId: notification.id, type: notification.type }, input.tenantId, input.actorId);

    const result = await this.delivery.deliver(notification);
    if (result.success) {
      await this.repository.markDelivered(notification.id);
    } else {
      await this.repository.markFailed(notification.id, result.reason || 'delivery_failed');
    }

    return notification;
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();

