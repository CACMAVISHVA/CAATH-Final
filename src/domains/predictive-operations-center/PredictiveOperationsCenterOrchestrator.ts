import { User } from '../../types';
import { getDashboardMetrics } from '../../services/dashboardService';
import { predictiveOperationsOrchestrator } from '../predictive-operations';
import { PredictiveOperationsCenterSnapshot, PredictiveSimulationRequest } from './types';

export class PredictiveOperationsCenterOrchestrator {
  async getSnapshot(user: User): Promise<PredictiveOperationsCenterSnapshot> {
    const predictive = await predictiveOperationsOrchestrator.getSnapshot(user);
    const metrics = user.firmId ? await getDashboardMetrics(user.firmId) : null;
    const simulationPreview = predictiveOperationsOrchestrator.simulate({
      scenario: 'redistribution',
      deltaWorkflows: Math.max(8, metrics?.pendingWorkloads || 0),
      currentOverdue: metrics?.overdueTasks || 0,
      currentEscalations: metrics?.escalationAlerts || 0,
      availableStaff: Math.max(1, (metrics?.overloadedStaff || 1) + 2),
    });
    return {
      generatedAt: new Date().toISOString(),
      predictive,
      simulationPreview,
      planningGuidance: [
        `Completion forecast: ${predictive.workflowCompletionPrediction}% for next cycle.`,
        `${predictive.slaBreachForecast}% SLA risk forecast; prioritize high-confidence lanes first.`,
        `Simulation suggests SLA risk ${simulationPreview.projectedSlaRisk}% under current redistribution model.`,
      ],
    };
  }

  runSimulation(input: PredictiveSimulationRequest) {
    return predictiveOperationsOrchestrator.simulate(input);
  }
}

export const predictiveOperationsCenterOrchestrator = new PredictiveOperationsCenterOrchestrator();
