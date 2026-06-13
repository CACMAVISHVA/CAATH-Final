import { recordOperationalTelemetry } from '../../../services/operationalTelemetryPipelineService';
import { AnalyticsSignalEvent, AnalyticsSignalPayloads } from '../events/analyticsEvents';

export const analyticsEventPublisher = {
  async publish<TEvent extends AnalyticsSignalEvent>(params: {
    event: TEvent;
    payload: AnalyticsSignalPayloads[TEvent];
    actor: { id?: string; name?: string; role?: string };
    severity?: 'info' | 'warning' | 'critical';
  }) {
    const payload = params.payload as Record<string, unknown>;
    const firmId = String(payload.tenantId || '');
    if (!firmId) return;

    await recordOperationalTelemetry({
      firmId,
      metric: 'event_propagation',
      eventName: params.event,
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role as any,
      workflowId: (payload.workflowId as string | undefined) || (payload.entityId as string | undefined),
      workflowType: (payload.workflowType as string | undefined) || (payload.entityType as string | undefined),
      severity: params.severity || 'info',
      payload,
    });
  },
};
