export type AnalyticsSignalEvent =
  | 'TASK_COMPLETION_METRIC'
  | 'NOTICE_RESPONSE_TIME'
  | 'CLIENT_ACTIVITY_SIGNAL'
  | 'WORKFLOW_LATENCY_EVENT'
  | 'COLLABORATION_ACTIVITY_EVENT';

export type AnalyticsSignalPayloads = {
  TASK_COMPLETION_METRIC: { tenantId: string; taskId: string; completionLatencyMs?: number };
  NOTICE_RESPONSE_TIME: { tenantId: string; noticeId: string; responseTimeMs: number };
  CLIENT_ACTIVITY_SIGNAL: { tenantId: string; clientId: string; activityType: string };
  WORKFLOW_LATENCY_EVENT: { tenantId: string; workflowType: string; workflowId?: string; latencyMs: number };
  COLLABORATION_ACTIVITY_EVENT: { tenantId: string; entityType: string; entityId: string; category: string };
};
