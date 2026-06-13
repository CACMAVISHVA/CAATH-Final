export type AutomationSignalEvent =
  | 'TASK_OVERDUE'
  | 'NOTICE_ESCALATED'
  | 'CLIENT_STATUS_CHANGED'
  | 'GST_DEADLINE_APPROACHING'
  | 'COMPLIANCE_RISK_DETECTED';

export type AutomationEventPayloads = {
  TASK_OVERDUE: { taskCount: number; tenantId: string };
  NOTICE_ESCALATED: { noticeCount: number; tenantId: string };
  CLIENT_STATUS_CHANGED: { clientId: string; previousStatus?: string; status: string; tenantId: string };
  GST_DEADLINE_APPROACHING: { filingCount: number; tenantId: string };
  COMPLIANCE_RISK_DETECTED: { riskScore: number; tenantId: string };
};
