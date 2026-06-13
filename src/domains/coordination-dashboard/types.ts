import {
  CoordinationTimelineItem,
  ExplainableCoordinationRecommendation,
  SynchronizationState,
  ThroughputOptimizationSnapshot,
  WorkloadRebalancePlan,
} from '../autonomous-coordination';

export interface CoordinationHealthIndicators {
  equilibriumScore: number;
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  escalationSyncStatus: 'stable' | 'watch' | 'critical';
}

export interface CoordinationDashboardViewModel {
  generatedAt: string;
  rebalancePlan: WorkloadRebalancePlan;
  throughput: ThroughputOptimizationSnapshot;
  recommendation: ExplainableCoordinationRecommendation;
  timeline: CoordinationTimelineItem[];
  synchronization: SynchronizationState;
  indicators: CoordinationHealthIndicators;
  requiresHumanApproval: boolean;
}
