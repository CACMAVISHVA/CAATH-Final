import { NotificationDeliveryPipeline } from './NotificationDeliveryPipeline';
import { NotificationPriorityManager } from './NotificationPriorityManager';
import { NotificationRetryPolicy } from './NotificationRetryPolicy';
import { NotificationRoutingEngine } from './NotificationRoutingEngine';
import { NotificationDeliveryTask, NotificationMessage } from './types';

export class NotificationRuntimeOrchestrator {
  constructor(
    private readonly routing = new NotificationRoutingEngine(),
    private readonly priority = new NotificationPriorityManager(),
    private readonly retry = new NotificationRetryPolicy(),
    private readonly pipeline: NotificationDeliveryPipeline,
  ) {}

  async dispatch(message: NotificationMessage): Promise<NotificationDeliveryTask[]> {
    const resolved = { ...message, priority: this.priority.resolvePriority(message), targets: this.routing.resolveTargets(message) };
    const channels = this.routing.resolveChannels(resolved);
    const followUps: NotificationDeliveryTask[] = [];

    for (const channel of channels) {
      const task: NotificationDeliveryTask = { notification: resolved, channel, attempt: 1, maxAttempts: 3 };
      const result = await this.pipeline.execute(task);
      if (!result.delivered && result.retryable) {
        const retryTask = this.retry.nextAttempt(task, result.reason || 'delivery_failed');
        if (retryTask) followUps.push(retryTask);
      }
    }

    return followUps;
  }
}

