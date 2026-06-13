import { UserRole } from '../../types';
import { AITaskQueueItem } from '../ai-task-queue';

export type CognitiveExecutionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ExecutionObjective {
  id: string;
  name: string;
  target: number;
  current: number;
  weight: number;
}

export interface StrategicWorkflowInfluence {
  id: string;
  taskId: string;
  objectiveId: string;
  influenceType: 'priority-boost' | 'escalation-route' | 'intent-alignment' | 'routing-shift';
  influenceScore: number;
  reason: string;
}

export interface ExplainableExecutionRecommendation {
  id: string;
  taskId: string;
  title: string;
  priority: CognitiveExecutionPriority;
  reasoning: string;
  objectiveAlignment: string;
  operationalContext: string;
  expectedImpact: string;
  strategicTradeoffs: string[];
  confidence: number;
}

export interface GovernedHandoffAction {
  id: string;
  recommendationId: string;
  taskId: string;
  actionType: 'boost-priority' | 'route-escalation' | 'assign-review' | 'hold';
  targetRole: UserRole;
  requiresHumanOverride: boolean;
  governanceStatus: 'approved' | 'needs-review' | 'blocked';
}

export interface CognitivePropagationEvent {
  id: string;
  type:
    | 'strategic-recommendation-generated'
    | 'workflow-influence-applied'
    | 'objective-propagated'
    | 'recommendation-routed'
    | 'override-requested';
  summary: string;
  createdAt: string;
}

export interface CognitiveExecutionInput {
  tenantId: string;
  queue: AITaskQueueItem[];
  objectives: ExecutionObjective[];
  actorRole: UserRole;
}

export interface CognitiveExecutionOutput {
  generatedAt: string;
  influencedQueue: AITaskQueueItem[];
  influences: StrategicWorkflowInfluence[];
  recommendations: ExplainableExecutionRecommendation[];
  handoffActions: GovernedHandoffAction[];
  timeline: CognitivePropagationEvent[];
}
