import { AIOpsDashboardIntelligence } from '../ai-operations';
import { AIWorkloadBalanceInsight, AITaskQueueItem, SLAIntelligenceSignal } from '../ai-task-queue';

export interface AIOperationsCenterSnapshot {
  generatedAt: string;
  taskQueue: AITaskQueueItem[];
  workload: AIWorkloadBalanceInsight;
  sla: SLAIntelligenceSignal;
  intelligence: AIOpsDashboardIntelligence;
}
