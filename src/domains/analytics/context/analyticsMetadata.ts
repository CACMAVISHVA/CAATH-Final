import { TenantWorkflowContext } from '../../workflows/context/tenantContext';
import { buildWorkflowMetadata } from '../../workflows/context/workflowMetadata';

export const buildAnalyticsMetadata = (context: TenantWorkflowContext) => {
  const workflowMeta = buildWorkflowMetadata(context);
  return {
    ...workflowMeta,
    traceType: 'analytics',
  };
};
