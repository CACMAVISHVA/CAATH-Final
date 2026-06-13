import { FabricEvent, UnifiedTimelineItem } from './types';

const categoryFromDomain = (domain: FabricEvent['domain']): UnifiedTimelineItem['category'] => {
  if (domain === 'workflows') return 'workflow';
  if (domain === 'ai_orchestration') return 'ai_action';
  if (domain === 'predictive_operations') return 'predictive_event';
  if (domain === 'escalations') return 'escalation';
  if (domain === 'gst') return 'reconciliation';
  if (domain === 'compliance') return 'resolution';
  if (domain === 'telemetry') return 'telemetry';
  return 'notification';
};

export class UnifiedOperationalTimeline {
  build(tenantId: string, events: FabricEvent[], limit = 200): UnifiedTimelineItem[] {
    return events
      .filter((event) => event.tenantId === tenantId)
      .map((event) => ({
        id: `timeline_${event.id}`,
        tenantId,
        timestamp: event.timestamp,
        category: categoryFromDomain(event.domain),
        title: event.name,
        description: JSON.stringify(event.payload),
        domains: [event.domain],
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }
}
