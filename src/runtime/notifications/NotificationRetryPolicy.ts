import { NotificationDeliveryTask } from './types';

export class NotificationRetryPolicy {
  nextAttempt(task: NotificationDeliveryTask, reason: string): NotificationDeliveryTask | undefined {
    if (task.attempt >= task.maxAttempts) return undefined;

    const jitterMs = Math.floor(Math.random() * 250);
    const backoffMs = Math.min(60_000, 1_000 * 2 ** task.attempt) + jitterMs;

    return {
      ...task,
      attempt: task.attempt + 1,
      deliverAfter: new Date(Date.now() + backoffMs).toISOString(),
      notification: {
        ...task.notification,
        payload: {
          ...(task.notification.payload || {}),
          retryReason: reason,
        },
      },
    };
  }
}

