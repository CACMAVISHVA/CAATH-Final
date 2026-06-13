import { AICoordinationIntelligence } from './AICoordinationIntelligence';
import { CoordinationGovernanceLayer } from './CoordinationGovernanceLayer';
import { CoordinationTimelineIntelligence } from './CoordinationTimelineIntelligence';
import { CrossTeamCoordinationEngine } from './CrossTeamCoordinationEngine';
import { IntelligentWorkloadRebalancer } from './IntelligentWorkloadRebalancer';
import { OperationalSynchronizationFabric } from './OperationalSynchronizationFabric';
import { RealtimeThroughputOptimizationEngine } from './RealtimeThroughputOptimizationEngine';
import { RuntimeSafetyController } from './RuntimeSafetyController';
import {
  CoordinationContext,
  CoordinationTimelineItem,
  CoordinationWorkItem,
  ExplainableCoordinationRecommendation,
  SynchronizationState,
  TeamCapacityProfile,
  ThroughputOptimizationSnapshot,
  WorkloadRebalancePlan,
} from './types';

export class AutonomousCoordinationOrchestrator {
  private readonly rebalancer = new IntelligentWorkloadRebalancer();
  private readonly crossTeam = new CrossTeamCoordinationEngine();
  private readonly throughput = new RealtimeThroughputOptimizationEngine();
  private readonly ai = new AICoordinationIntelligence();
  private readonly governance = new CoordinationGovernanceLayer();
  private readonly runtimeSafety = new RuntimeSafetyController();
  private readonly timeline = new CoordinationTimelineIntelligence();
  private readonly syncFabric = new OperationalSynchronizationFabric();

  coordinate(input: {
    context: CoordinationContext;
    queue: CoordinationWorkItem[];
    teams: TeamCapacityProfile[];
  }): {
    plan: WorkloadRebalancePlan;
    throughput: ThroughputOptimizationSnapshot;
    recommendation: ExplainableCoordinationRecommendation;
    timeline: CoordinationTimelineItem[];
    synchronization: SynchronizationState;
    requiresHumanApproval: boolean;
  } {
    if (!this.runtimeSafety.canApply(input.context.tenantId)) {
      throw new Error('Coordination throttle triggered to prevent oscillation and runtime instability.');
    }

    const plan = this.rebalancer.buildPlan(input);
    const governance = this.governance.evaluate(input.context, plan);
    const directives = this.crossTeam.harmonize(input.context, plan);
    const throughput = this.throughput.evaluate(input.context, plan);
    const recommendation = this.ai.recommend({
      tenantId: input.context.tenantId,
      plan,
      throughput,
      directives,
    });
    const timeline = this.timeline.build(input.context.tenantId, plan.actions);
    const synchronization = this.syncFabric.synchronize(input.context.tenantId);

    if (!governance.allowed) {
      throw new Error(`Coordination governance denied plan: ${governance.reasons.join('; ')}`);
    }

    return {
      plan,
      throughput,
      recommendation,
      timeline,
      synchronization,
      requiresHumanApproval: governance.requiresHumanApproval,
    };
  }
}

export const autonomousCoordinationOrchestrator = new AutonomousCoordinationOrchestrator();
