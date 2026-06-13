import { AITaskQueueItem } from '../ai-task-queue';
import { CognitiveExecutionInput, StrategicWorkflowInfluence } from './types';

export class StrategicWorkflowInfluenceEngine {
  apply(input: CognitiveExecutionInput): { queue: AITaskQueueItem[]; influences: StrategicWorkflowInfluence[] } {
    const topObjective = [...input.objectives]
      .sort((a, b) => (b.target - b.current) * b.weight - (a.target - a.current) * a.weight)[0];

    if (!topObjective) {
      return { queue: input.queue, influences: [] };
    }

    const influences: StrategicWorkflowInfluence[] = [];

    const influencedQueue = input.queue.map((item) => {
      const isSlaRisk = item.slaBreachProbability >= 70;
      const isEscalationRisk = item.escalationScore >= 70;
      const boost = isSlaRisk || isEscalationRisk ? 12 : 0;

      if (boost > 0) {
        influences.push({
          id: `infl-${item.taskId}-${topObjective.id}`,
          taskId: item.taskId,
          objectiveId: topObjective.id,
          influenceType: isEscalationRisk ? 'escalation-route' : 'priority-boost',
          influenceScore: boost,
          reason: `High-priority workflow boosted due to ${topObjective.name} objective pressure.`,
        });
      }

      return {
        ...item,
        urgencyScore: Math.min(100, item.urgencyScore + boost),
        explanation:
          boost > 0
            ? `${item.explanation} Strategic influence: +${boost} for ${topObjective.name}.`
            : item.explanation,
      };
    });

    const sorted = [...influencedQueue].sort(
      (a, b) => b.urgencyScore + b.escalationScore - (a.urgencyScore + a.escalationScore),
    );

    return { queue: sorted, influences };
  }
}
