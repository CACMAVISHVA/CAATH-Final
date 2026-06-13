import { CoordinationTimelineItem, RoutingDecision } from './types';

export class CoordinationTimelineIntelligence {
  build(tenantId: string, actions: RoutingDecision[]): CoordinationTimelineItem[] {
    const now = new Date().toISOString();
    return actions.map((action, index) => ({
      id: `coord_timeline_${index}_${action.workItemId}`,
      tenantId,
      timestamp: now,
      actionType: action.routingMode === 'escalation_sensitive' ? 'escalation_sync' : 'routing_change',
      title: `Routing update for ${action.workItemId}`,
      detail: `Moved to ${action.destinationTeamId} using ${action.routingMode}.`,
      confidence: action.confidence,
    }));
  }
}
