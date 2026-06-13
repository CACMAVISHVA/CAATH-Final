import { generateTraceId } from '../../../shared/utils/trace';
import { TenantWorkflowContext } from '../context/tenantContext';

export interface WorkflowMetadata {
  correlationId: string;
  tenantId: string;
  actorId?: string;
  actorRole?: string;
  emittedAt: string;
}

export const buildWorkflowMetadata = (context: TenantWorkflowContext): WorkflowMetadata => ({
  correlationId: context.traceId || generateTraceId(),
  tenantId: context.firmId,
  actorId: context.actor.id,
  actorRole: context.actor.role,
  emittedAt: new Date().toISOString(),
});
