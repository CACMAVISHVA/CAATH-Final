import { User } from '../../types';
import { aiOperationsOrchestrator } from '../ai-operations';
import { aiTaskQueueOrchestrator } from '../ai-task-queue';
import { getTasks } from '../tasks/services/taskDomainService';
import { AIOperationsCenterSnapshot } from './types';

export class AIOperationsCenterOrchestrator {
  async getSnapshot(user: User): Promise<AIOperationsCenterSnapshot> {
    if (!user.firmId) {
      return {
        generatedAt: new Date().toISOString(),
        taskQueue: [],
        workload: { overloadedUsers: [], recommendation: 'No tenant context.', suggestedReassignmentCount: 0 },
        sla: { highRiskCount: 0, mediumRiskCount: 0, summary: 'No tenant context.' },
        intelligence: {
          summary: 'AI operations center unavailable.',
          recommendations: [],
          complianceNarrative: {
            title: 'Context missing',
            narrative: 'Tenant context is required.',
            riskBand: 'moderate',
            explainabilityNote: 'No execution performed.',
          },
          optimization: { efficiencyScore: 0, bottleneckRisk: 0, escalationPressure: 0, delayPrediction: 0, recommendations: [] },
        },
      };
    }

    const [taskQueue, tasks, intelligence] = await Promise.all([
      aiTaskQueueOrchestrator.getPrioritizedQueue(user),
      getTasks(user.firmId),
      aiOperationsOrchestrator.getDashboardIntelligence(user),
    ]);
    const workload = aiTaskQueueOrchestrator.getWorkloadBalanceInsights(tasks);
    const sla = aiTaskQueueOrchestrator.getSLAIntelligence(taskQueue);

    return {
      generatedAt: new Date().toISOString(),
      taskQueue,
      workload,
      sla,
      intelligence,
    };
  }
}

export const aiOperationsCenterOrchestrator = new AIOperationsCenterOrchestrator();
