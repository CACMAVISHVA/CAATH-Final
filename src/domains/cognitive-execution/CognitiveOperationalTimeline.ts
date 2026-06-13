import { CognitivePropagationEvent, GovernedHandoffAction, StrategicWorkflowInfluence } from './types';

export class CognitiveOperationalTimeline {
  build(influences: StrategicWorkflowInfluence[], actions: GovernedHandoffAction[]): CognitivePropagationEvent[] {
    const now = new Date().toISOString();
    const influenceEvents = influences.slice(0, 6).map((influence) => ({
      id: `evt-infl-${influence.id}`,
      type: 'workflow-influence-applied' as const,
      summary: influence.reason,
      createdAt: now,
    }));
    const actionEvents = actions.slice(0, 6).map((action) => ({
      id: `evt-act-${action.id}`,
      type: action.requiresHumanOverride ? ('override-requested' as const) : ('recommendation-routed' as const),
      summary: `Recommendation for task ${action.taskId} routed as ${action.actionType} (${action.governanceStatus}).`,
      createdAt: now,
    }));
    return [...influenceEvents, ...actionEvents];
  }
}
