import { DomainEventName, eventBus } from '../../events';
import { NotificationDeliveryTask, NotificationMessage } from '../notifications';
import { SupabaseRealtimeRuntime } from '../realtime';
import { RuntimeContext, RuntimeHealthSnapshot } from './types';
import { runtimeEventService } from './RuntimeEventService';
import { runtimeNotificationService } from './RuntimeNotificationService';
import { runtimeObservabilityService } from './RuntimeObservabilityService';
import { runtimeQueueService } from './RuntimeQueueService';
import { runtimeSecurityService } from './RuntimeSecurityService';

const notificationEventMap: Partial<Record<DomainEventName, { title: string; priority: NotificationMessage['priority'] }>> = {
  TASK_ASSIGNED: { title: 'Task Assigned', priority: 'normal' },
  NOTICE_ESCALATED: { title: 'Notice Escalated', priority: 'high' },
  WORKFLOW_RISK_IDENTIFIED: { title: 'Workflow Risk Identified', priority: 'high' },
  COMPLIANCE_ACTION_RECOMMENDED: { title: 'Compliance Action Recommended', priority: 'normal' },
};

export class RuntimeKernel {
  private readonly startedAt = new Date().toISOString();
  private readonly realtime = new SupabaseRealtimeRuntime();
  private stopEventBridge: (() => void) | null = null;
  private started = false;
  private streams = new Set<string>();

  start(): void {
    if (this.started) return;
    this.started = true;

    this.stopEventBridge = runtimeEventService.bridgeDomainEvents();
    runtimeQueueService.registerHandler('notification_delivery', async (job) => {
      const retryTask = job.payload as unknown as NotificationDeliveryTask;
      await runtimeNotificationService.dispatchRetryTask(retryTask);
    });
    runtimeQueueService.start();

    eventBus.subscribe('TASK_ASSIGNED', async (event) => this.onDomainEvent(event.name, event.tenantId, event.actorId, event.payload));
    eventBus.subscribe('NOTICE_ESCALATED', async (event) => this.onDomainEvent(event.name, event.tenantId, event.actorId, event.payload));
    eventBus.subscribe('WORKFLOW_RISK_IDENTIFIED', async (event) => this.onDomainEvent(event.name, event.tenantId, event.actorId, event.payload));
    eventBus.subscribe('COMPLIANCE_ACTION_RECOMMENDED', async (event) => this.onDomainEvent(event.name, event.tenantId, event.actorId, event.payload));

    runtimeObservabilityService.log('runtime_kernel_started');
  }

  stop(): void {
    this.stopEventBridge?.();
    this.realtime.shutdown();
    runtimeQueueService.stop();
    this.started = false;
  }

  subscribeUserNotifications(params: { userId: string; firmId?: string; role?: string }, onChanged: () => void | Promise<void>): () => void {
    const key = `${params.firmId || 'global'}:${params.userId}:${params.role || 'all'}`;
    this.streams.add(key);
    const off = this.realtime.subscribeNotifications(key, params, onChanged);
    return () => {
      off();
      this.streams.delete(key);
    };
  }

  trackSecuritySignal(tenantId: string, signal: { sessionId: string; impossibleTravel: boolean; rapidFailures: boolean }) {
    return runtimeSecurityService.trackAuthAnomaly(tenantId, signal);
  }

  health(): RuntimeHealthSnapshot {
    const notificationHealth = runtimeNotificationService.health();
    return {
      startedAt: this.startedAt,
      queue: { pending: runtimeQueueService.pendingCount(), deadLetters: runtimeQueueService.deadLetterCount() },
      realtime: { activeNotificationStreams: this.streams.size },
      notifications: notificationHealth,
      security: { trackedTenants: runtimeSecurityService.trackedTenantCount() },
    };
  }

  private async onDomainEvent(name: DomainEventName, tenantId?: string, actorId?: string, payload?: unknown): Promise<void> {
    const config = notificationEventMap[name];
    if (!config || !tenantId) return;

    const data = (payload || {}) as Record<string, unknown>;
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await runtimeNotificationService.dispatch({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      type: name,
      title: config.title,
      body: (typeof data.message === 'string' && data.message) || `${name} event occurred`,
      targets: [{
        role: typeof data.role === 'string' ? data.role : 'Admin',
        userId: typeof data.userId === 'string' ? data.userId : undefined,
      }],
      priority: config.priority,
      correlationId,
      triggeredBy: actorId,
      triggeredAt: new Date().toISOString(),
    });

    await runtimeEventService.emit(
      `runtime.notification.${name.toLowerCase()}`,
      { eventName: name, actorId, payload: data },
      tenantId,
      correlationId,
    );
  }
}

export const runtimeKernel = new RuntimeKernel();

export const withRuntimeContext = (context: RuntimeContext): Required<RuntimeContext> => ({
  tenantId: context.tenantId || 'system',
  actorId: context.actorId || 'system',
  actorRole: context.actorRole || 'Admin',
  correlationId: context.correlationId || `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
});
