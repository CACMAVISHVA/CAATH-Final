import { AITaskQueueItem } from '../ai-task-queue';
import { CognitiveRecommendationHandoffRuntime } from './CognitiveRecommendationHandoffRuntime';
import { CognitiveExecutionGovernance } from './CognitiveExecutionGovernance';
import { CognitiveExecutionSafetyController } from './CognitiveExecutionSafetyController';
import { CognitiveOperationalTimeline } from './CognitiveOperationalTimeline';
import { StrategicWorkflowInfluenceEngine } from './StrategicWorkflowInfluenceEngine';
import {
  CognitiveExecutionInput,
  CognitiveExecutionOutput,
  ExplainableExecutionRecommendation,
} from './types';

const toPriority = (item: AITaskQueueItem): ExplainableExecutionRecommendation['priority'] => {
  if (item.escalationScore >= 85 || item.slaBreachProbability >= 85) return 'critical';
  if (item.escalationScore >= 70 || item.slaBreachProbability >= 70) return 'high';
  if (item.escalationScore >= 45 || item.slaBreachProbability >= 45) return 'medium';
  return 'low';
};

export class CognitiveExecutionOrchestrator {
  private readonly influenceEngine = new StrategicWorkflowInfluenceEngine();
  private readonly handoffRuntime = new CognitiveRecommendationHandoffRuntime();
  private readonly governance = new CognitiveExecutionGovernance();
  private readonly timeline = new CognitiveOperationalTimeline();
  private readonly safety = new CognitiveExecutionSafetyController();

  execute(input: CognitiveExecutionInput): CognitiveExecutionOutput {
    const canRun = this.safety.canRun(input.tenantId);
    const cached = this.safety.getCachedQueue(input.tenantId);
    const sourceQueue = !canRun && cached ? cached : input.queue;

    const influenced = this.influenceEngine.apply({ ...input, queue: sourceQueue });
    this.safety.setCachedQueue(input.tenantId, influenced.queue);

    const recommendations = influenced.queue.slice(0, 8).map((item) => ({
      id: `exec-rec-${item.taskId}`,
      taskId: item.taskId,
      title: `Prioritize ${item.title}`,
      priority: toPriority(item),
      reasoning: `Task shows urgency ${item.urgencyScore} and escalation ${item.escalationScore}.`,
      objectiveAlignment: 'Aligned with SLA stabilization and controlled escalation objectives.',
      operationalContext: item.explanation,
      expectedImpact: 'Improved due-date reliability and lower escalation spillover.',
      strategicTradeoffs: [
        'Higher focus on urgent lanes may reduce low-priority throughput.',
        'Escalation-first routing improves resilience but increases reviewer load.',
      ],
      confidence: Math.min(0.92, 0.55 + item.slaBreachProbability / 200),
    }));

    const handoffActions = this.governance.enforce(
      this.handoffRuntime.route(recommendations, input.actorRole),
    );
    const timeline = this.timeline.build(influenced.influences, handoffActions);

    return {
      generatedAt: new Date().toISOString(),
      influencedQueue: influenced.queue,
      influences: influenced.influences,
      recommendations,
      handoffActions,
      timeline,
    };
  }
}

export const cognitiveExecutionOrchestrator = new CognitiveExecutionOrchestrator();
