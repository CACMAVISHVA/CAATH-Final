import { UserRole } from '../../../types';

export type SupportTicketCategory =
  | 'technical_issue'
  | 'workflow_issue'
  | 'billing_issue'
  | 'payroll_issue'
  | 'compliance_issue'
  | 'operational_request'
  | 'feature_request'
  | 'governance_escalation';

export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type SupportTicketStatus = 'open' | 'investigating' | 'awaiting-response' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  firmId: string;
  createdBy: string;
  createdByName: string;
  createdByRole: UserRole;
  category: SupportTicketCategory;
  title: string;
  description: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedToUserId: string | null;
  visibilityRoles: UserRole[];
  escalationState: 'none' | 'escalated' | 'governance-review';
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketReply {
  id: string;
  ticketId: string;
  message: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  createdAt: string;
}
