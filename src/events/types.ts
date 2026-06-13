export type DomainEventName =
  | 'TICKET_CREATED'
  | 'GST_NOTICE_RECEIVED'
  | 'CLIENT_ADDED'
  | 'CLIENT_CREATED'
  | 'PORTAL_ACCESSED'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'NOTICE_RECEIVED'
  | 'NOTICE_ESCALATED'
  | 'AUDIT_EVENT_RECORDED'
  | 'NOTIFICATION_SENT'
  | 'WORKFLOW_TRIGGERED'
  | 'OPERATIONAL_ASSISTANCE_TRIGGERED'
  | 'ROLE_DASHBOARD_CONTEXT_UPDATED'
  | 'COMMAND_CENTER_ACTION_EXECUTED'
  | 'WORKFLOW_RISK_IDENTIFIED'
  | 'COMPLIANCE_ACTION_RECOMMENDED';

export type DomainEvent<TPayload = unknown> = {
  name: DomainEventName;
  timestamp: string;
  tenantId?: string;
  actorId?: string;
  payload: TPayload;
};
