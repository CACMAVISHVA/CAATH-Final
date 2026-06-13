import { eventBus } from '../../../events';

export type WorkflowDomainEventName =
  | 'TASK_ACTIVITY_CREATED'
  | 'NOTICE_STATUS_CHANGED'
  | 'CLIENT_ASSIGNED'
  | 'GST_DEADLINE_TRIGGERED'
  | 'TASK_OVERDUE'
  | 'NOTICE_ESCALATED'
  | 'CLIENT_STATUS_CHANGED'
  | 'GST_DEADLINE_APPROACHING'
  | 'COMPLIANCE_RISK_DETECTED';

export type WorkflowEventPayloads = {
  TASK_ACTIVITY_CREATED: {
    taskId: string;
    activityType: string;
    actorId: string;
  };
  NOTICE_STATUS_CHANGED: {
    noticeId: string;
    previousStatus: string;
    nextStatus: string;
    actorId: string;
  };
  CLIENT_ASSIGNED: {
    clientId: string;
    assignedTo: string;
    actorId: string;
  };
  GST_DEADLINE_TRIGGERED: {
    firmId: string;
    filingId: string;
  };
  TASK_OVERDUE: {
    taskCount: number;
    tenantId: string;
  };
  NOTICE_ESCALATED: {
    noticeCount: number;
    tenantId: string;
  };
  CLIENT_STATUS_CHANGED: {
    clientId: string;
    previousStatus?: string;
    status: string;
    tenantId: string;
  };
  GST_DEADLINE_APPROACHING: {
    filingCount: number;
    tenantId: string;
  };
  COMPLIANCE_RISK_DETECTED: {
    riskScore: number;
    tenantId: string;
  };
};

export const emitWorkflowEvent = async <TName extends WorkflowDomainEventName>(
  name: TName,
  payload: WorkflowEventPayloads[TName],
  tenantId?: string,
  actorId?: string,
) => {
  await eventBus.publish({
    name: 'WORKFLOW_TRIGGERED',
    timestamp: new Date().toISOString(),
    tenantId,
    actorId,
    payload: {
      workflowEventName: name,
      ...payload,
    },
  });
};
