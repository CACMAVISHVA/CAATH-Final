import { NotificationDeliveryResult, NotificationDeliveryTask } from './types';

export interface NotificationDeliveryAdapter {
  deliver(task: NotificationDeliveryTask): Promise<NotificationDeliveryResult>;
}

export class NotificationDeliveryPipeline {
  constructor(private readonly adapter: NotificationDeliveryAdapter) {}

  async execute(task: NotificationDeliveryTask): Promise<NotificationDeliveryResult> {
    return this.adapter.deliver(task);
  }
}

export class NoopNotificationDeliveryAdapter implements NotificationDeliveryAdapter {
  async deliver(task: NotificationDeliveryTask): Promise<NotificationDeliveryResult> {
    return {
      delivered: true,
      providerMessageId: `noop_${task.notification.id}_${task.channel}`,
    };
  }
}

