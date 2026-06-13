import { canWorkflowTransition, WorkflowEntity } from '../../../services/workflowEngineService';

export const workflowStateMachine = {
  canTransition(entity: WorkflowEntity, from: string, to: string, role: string) {
    return canWorkflowTransition(entity, from, to, role as any);
  },
};
