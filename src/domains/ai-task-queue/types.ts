import { TaskRow } from '../tasks/services/taskDomainService';

export interface AITaskQueueItem {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  urgencyScore: number;
  slaBreachProbability: number;
  escalationScore: number;
  recommendedAction: 'assign' | 'escalate' | 'remind' | 'review' | 'close' | 'reconcile';
  explanation: string;
  sourceTask?: TaskRow;
}

export interface AIWorkloadBalanceInsight {
  overloadedUsers: Array<{ userId: string; activeTasks: number }>;
  recommendation: string;
  suggestedReassignmentCount: number;
}

export interface SLAIntelligenceSignal {
  highRiskCount: number;
  mediumRiskCount: number;
  summary: string;
}
