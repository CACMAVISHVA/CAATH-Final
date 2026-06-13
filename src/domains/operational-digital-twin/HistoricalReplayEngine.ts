import { operationalIntelligenceFabricOrchestrator } from '../operational-fabric';
import { HistoricalReplayRequest, HistoricalReplayResult } from './types';

const pickBaseline = (value?: string): HistoricalReplayResult['scenarioBaseline'] => {
  if (value === 'task_routing') return 'task_routing';
  if (value === 'escalation_cascade') return 'escalation_cascade';
  if (value === 'staff_reassignment') return 'staff_reassignment';
  if (value === 'sla_pressure') return 'sla_pressure';
  if (value === 'capacity_stress') return 'capacity_stress';
  if (value === 'compliance_risk') return 'compliance_risk';
  return 'workflow_surge';
};

export class HistoricalReplayEngine {
  replay(request: HistoricalReplayRequest): HistoricalReplayResult {
    const memory = operationalIntelligenceFabricOrchestrator
      .search({
        tenantId: request.tenantId,
        actor: { id: 'simulation', role: 'Admin', firmId: request.tenantId },
        text: 'workflow escalation telemetry predictive',
        limit: 200,
      })
      .filter((item) => item.timestamp >= request.windowStart && item.timestamp <= request.windowEnd);

    const actualBacklog = memory.filter((item) => item.type === 'event').length;
    const actualEscalations = memory.filter((item) => item.summary.toLowerCase().includes('escalation')).length;
    const predictedBacklog = Math.round(actualBacklog * 0.92);
    const predictedEscalations = Math.round(actualEscalations * 1.08);
    const varianceScore = Math.abs(predictedBacklog - actualBacklog) + Math.abs(predictedEscalations - actualEscalations);

    return {
      replayId: `replay_${request.tenantId}_${Date.now()}`,
      scenarioBaseline: pickBaseline(request.baselineScenarioType),
      actualBacklog,
      predictedBacklog,
      actualEscalations,
      predictedEscalations,
      varianceScore,
      insights: [
        `Historical event count in window: ${actualBacklog}`,
        `Escalation variance score: ${Math.abs(predictedEscalations - actualEscalations)}`,
        'Use variance trends to recalibrate scenario assumptions before peak filing periods.',
      ],
    };
  }
}
