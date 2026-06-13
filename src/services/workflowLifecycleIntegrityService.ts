import {
  WorkflowIntegrityFinding,
  WorkflowIntegritySummary,
  IntegritySeverity,
} from '../domains/workflows/policies/lifecyclePolicies';
import { workflowLifecycleIntegrityOrchestrator } from '../domains/workflows/services/workflowLifecycleIntegrityOrchestrator';

export type { WorkflowIntegrityFinding, WorkflowIntegritySummary, IntegritySeverity };

export const getWorkflowLifecycleIntegritySummary = (firmId: string): Promise<WorkflowIntegritySummary> =>
  workflowLifecycleIntegrityOrchestrator.getWorkflowLifecycleIntegritySummary(firmId);
