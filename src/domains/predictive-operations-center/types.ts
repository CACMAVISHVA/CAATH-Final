import { PredictiveOperationsSnapshot, WorkflowSimulationInput, WorkflowSimulationResult } from '../predictive-operations';

export interface PredictiveOperationsCenterSnapshot {
  generatedAt: string;
  predictive: PredictiveOperationsSnapshot;
  simulationPreview: WorkflowSimulationResult;
  planningGuidance: string[];
}

export interface PredictiveSimulationRequest extends WorkflowSimulationInput {}
