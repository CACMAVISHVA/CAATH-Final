import { supabase } from '../../lib/supabase';
import {
  NotificationDeliveryAdapter,
  NotificationDeliveryPipeline,
  NotificationDeliveryTask,
  NotificationMessage,
  NotificationRuntimeOrchestrator,
} from '../notifications';
import { runtimeAuditService } from './RuntimeAuditService';
import { runtimeObservabilityService } from './RuntimeObservabilityService';
import { runtimeQueueService } from './RuntimeQueueService';
import { withTimeout } from './RuntimeResilience';

class RuntimeNotificationAdapter implements NotificationDeliveryAdapter {
  private mapPriority(priority: NotificationMessage['priority']): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (priority === 'normal') return 'MEDIUM';
    return priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }

  async deliver(task: Parameters<NotificationDeliveryAdapter['deliver']>[0]) {
    const notification = task.notification;

    if (task.channel === 'in_app' || task.channel === 'websocket') {
      for (const target of notification.targets) {
        const { error } = await withTimeout<{ error: { message: string } | null }>(
          supabase.from('notifications').insert([{
            firm_id: notification.tenantId,
            recipient_user_id: target.userId || null,
            audience_role: target.role || null,
            title: notification.title,
            message: notification.body,
            status: 'UNREAD',
            priority: this.mapPriority(notification.priority),
            created_by: notification.triggeredBy || null,
            updated_by: notification.triggeredBy || null,
          }]),
          4000,
          'runtime_notification_insert_timeout',
        );
        if (error) return { delivered: false, reason: error.message, retryable: true };
      }
      return { delivered: true, providerMessageId: `inapp_${notification.id}` };
    }

    runtimeObservabilityService.log('runtime_notification_provider_placeholder', {
      channel: task.channel,
      notificationId: notification.id,
      tenantId: notification.tenantId,
    });
    return { delivered: true, providerMessageId: `${task.channel}_${notification.id}` };
  }
}

export class RuntimeNotificationService {
  private readonly orchestrator = new NotificationRuntimeOrchestrator(
    undefined,
    undefined,
    undefined,
    new NotificationDeliveryPipeline(new RuntimeNotificationAdapter()),
  );
  private dispatched = 0;
  private failed = 0;

  async dispatch(message: NotificationMessage): Promise<void> {
    const followUps = await this.orchestrator.dispatch(message);
    this.dispatched += 1;

    await runtimeAuditService.append({
      tenantId: message.tenantId,
      actorId: message.triggeredBy,
      action: 'NOTIFICATION_DISPATCHED',
      entityType: 'notification',
      entityId: message.id,
      details: `${message.type} dispatched with priority ${message.priority}`,
      correlationId: message.correlationId,
    });

    if (followUps.length > 0) {
      this.failed += followUps.length;
      for (const retryTask of followUps) {
        runtimeQueueService.enqueue({
          id: `job_${retryTask.notification.id}_${retryTask.channel}_${retryTask.attempt}`,
          tenantId: retryTask.notification.tenantId,
          type: 'notification_delivery',
          payload: retryTask as unknown as Record<string, unknown>,
          correlationId: retryTask.notification.correlationId,
          priority: retryTask.notification.priority,
          attempts: retryTask.attempt,
          maxAttempts: retryTask.maxAttempts,
          scheduledAt: retryTask.deliverAfter || new Date().toISOString(),
        });
      }
    }

    runtimeObservabilityService.metric('runtime.notifications.dispatched', 1, { type: message.type }, message.tenantId);
  }

  async dispatchRetryTask(task: NotificationDeliveryTask): Promise<void> {
    const pipeline = new NotificationDeliveryPipeline(new RuntimeNotificationAdapter());
    const result = await pipeline.execute(task);
    if (!result.delivered) {
      this.failed += 1;
    } else {
      this.dispatched += 1;
    }
  }

  health(): { dispatched: number; failed: number } {
    return { dispatched: this.dispatched, failed: this.failed };
  }
}

export const runtimeNotificationService = new RuntimeNotificationService();
