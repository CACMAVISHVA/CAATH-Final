import { User } from '../types';
import {
  workflowAutomationOrchestrator,
  WorkflowAutomationExecution,
} from '../domains/workflows/services/workflowAutomationOrchestrator';
import {
  WorkflowRuleActionType,
  WorkflowRuleEvaluation,
  WorkflowTrigger,
  WorkflowTriggerType,
} from '../domains/workflows/policies/automationPolicies';

export type {
  WorkflowTriggerType,
  WorkflowRuleActionType,
  WorkflowTrigger,
  WorkflowRuleEvaluation,
  WorkflowAutomationExecution,
};

export const evaluateWorkflowAutomation = (firmId: string, user: User): Promise<WorkflowAutomationExecution> =>
  workflowAutomationOrchestrator.evaluateWorkflowAutomation(firmId, user);
