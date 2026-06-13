import { eventBus } from '../../events';
import { RuntimeEvent, RuntimeEventBus } from '../events';
import { runtimeAuditService } from './RuntimeAuditService';
import { runtimeObservabilityService } from './RuntimeObservabilityService';

export class RuntimeEventService {
  readonly bus = new RuntimeEventBus();

  async emit(name: string, payload: Record<string, unknown>, tenantId: string, correlationId: string): Promise<void> {
    const event: RuntimeEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      version: 1,
      tenantId,
      payload,
      correlationId,
      occurredAt: new Date().toISOString(),
    };
    await this.bus.publish(event);
  }

  bridgeDomainEvents(): () => void {
    const domainEvents = [
      'TASK_ASSIGNED',
      'TASK_COMPLETED',
      'NOTICE_ESCALATED',
      'WORKFLOW_TRIGGERED',
      'NOTIFICATION_SENT',
      'AUDIT_EVENT_RECORDED',
    ] as const;

    const unsubscribers = domainEvents.map((eventName) =>
      eventBus.subscribe(eventName, async (domainEvent) => {
        const tenantId = domainEvent.tenantId || 'system';
        const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await this.emit(domainEvent.name, { payload: domainEvent.payload }, tenantId, correlationId);
      }),
    );

    const off = this.bus.subscribe(async (event) => {
      runtimeObservabilityService.log('runtime_event_emitted', { eventName: event.name, tenantId: event.tenantId, correlationId: event.correlationId });
      await runtimeAuditService.append({
        tenantId: event.tenantId,
        action: 'RUNTIME_EVENT_EMITTED',
        entityType: 'runtime_event',
        entityId: event.id,
        details: `${event.name} emitted`,
        correlationId: event.correlationId,
      });
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      off();
    };
  }
}

export const runtimeEventService = new RuntimeEventService();

