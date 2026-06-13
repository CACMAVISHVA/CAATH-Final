import { UserRole } from '../../types';

export type WorkflowTemplateType =
  | 'gst_notice_lifecycle'
  | 'client_onboarding'
  | 'audit_assignment'
  | 'compliance_escalation'
  | 'approval_chain';

export interface WorkflowTemplate {
  id: WorkflowTemplateType;
  title: string;
  states: string[];
  escalationStates: string[];
  dependencies?: string[];
}

export interface WorkflowInstance {
  id: string;
  templateId: WorkflowTemplateType;
  tenantId: string;
  state: string;
  assignedRole: UserRole;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
}

