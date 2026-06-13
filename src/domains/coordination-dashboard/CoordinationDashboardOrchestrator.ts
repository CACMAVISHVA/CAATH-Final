import { autonomousCoordinationOrchestrator, CoordinationContext, CoordinationWorkItem, TeamCapacityProfile } from '../autonomous-coordination';
import { CoordinationDashboardViewModel } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export class CoordinationDashboardOrchestrator {
  buildViewModel(input: {
    context: CoordinationContext;
    queue: CoordinationWorkItem[];
    teams: TeamCapacityProfile[];
  }): CoordinationDashboardViewModel {
    const coordinated = autonomousCoordinationOrchestrator.coordinate(input);
    const equilibriumScore = clamp(
      (coordinated.plan.netImpact.congestionReduction * 0.4)
      + (coordinated.throughput.velocityBalanceScore * 0.35)
      + (100 - coordinated.synchronization.driftScore) * 0.25,
    );
    const congestionLevel = coordinated.throughput.congestionRisk >= 80 ? 'critical'
      : coordinated.throughput.congestionRisk >= 60 ? 'high'
        : coordinated.throughput.congestionRisk >= 35 ? 'medium'
          : 'low';
    const escalationSyncStatus = coordinated.synchronization.driftScore >= 70 ? 'critical'
      : coordinated.synchronization.driftScore >= 40 ? 'watch'
        : 'stable';

    return {
      generatedAt: new Date().toISOString(),
      rebalancePlan: coordinated.plan,
      throughput: coordinated.throughput,
      recommendation: coordinated.recommendation,
      timeline: coordinated.timeline,
      synchronization: coordinated.synchronization,
      indicators: {
        equilibriumScore,
        congestionLevel,
        escalationSyncStatus,
      },
      requiresHumanApproval: coordinated.requiresHumanApproval,
    };
  }
}

export const coordinationDashboardOrchestrator = new CoordinationDashboardOrchestrator();
