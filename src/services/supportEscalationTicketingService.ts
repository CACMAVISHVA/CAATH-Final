import { User } from '../types';
import { ticketService } from '../domains/tickets/services/ticketService';
import {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketReply,
  SupportTicketStatus,
} from '../domains/tickets/dto/ticketDtos';

export type {
  SupportTicket,
  SupportTicketReply,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
};

export const createSupportTicket = (params: {
  user: User;
  category: SupportTicketCategory;
  title: string;
  description: string;
  priority?: SupportTicketPriority;
  assignedToUserId?: string | null;
  escalationState?: 'none' | 'escalated' | 'governance-review';
}) => ticketService.createSupportTicket(params);

export const getSupportTickets = (user: User): Promise<SupportTicket[]> => ticketService.getSupportTickets(user);

export const updateSupportTicketStatus = (params: {
  user: User;
  ticketId: string;
  status: SupportTicketStatus;
  assignedToUserId?: string | null;
  escalationState?: 'none' | 'escalated' | 'governance-review';
}) => ticketService.updateSupportTicketStatus(params);

export const addSupportTicketReply = (params: { user: User; ticketId: string; message: string }) => ticketService.addSupportTicketReply(params);

export const getSupportTicketTimeline = (params: { user: User; ticketId: string }) => ticketService.getSupportTicketTimeline(params);

export const collectPilotFeedback = (params: {
  user: User;
  title: string;
  feedback: string;
  workflowArea?: string;
}) => ticketService.createSupportTicket({
  user: params.user,
  category: 'feature_request',
  title: params.title,
  description: [
    params.workflowArea ? `Workflow area: ${params.workflowArea}` : null,
    params.feedback,
  ].filter(Boolean).join('\n\n'),
  priority: 'low',
});

export const reportPilotError = (params: {
  user: User;
  title: string;
  errorMessage: string;
  workflowArea?: string;
  reproductionSteps?: string;
}) => ticketService.createSupportTicket({
  user: params.user,
  category: 'technical_issue',
  title: params.title,
  description: [
    params.workflowArea ? `Workflow area: ${params.workflowArea}` : null,
    `Error: ${params.errorMessage}`,
    params.reproductionSteps ? `Steps to reproduce:\n${params.reproductionSteps}` : null,
  ].filter(Boolean).join('\n\n'),
  priority: 'high',
  escalationState: 'escalated',
});

export const escalateSupportIssue = (params: {
  user: User;
  ticketId: string;
  reason: string;
  governanceReview?: boolean;
}) => ticketService.updateSupportTicketStatus({
  user: params.user,
  ticketId: params.ticketId,
  status: 'investigating',
  escalationState: params.governanceReview ? 'governance-review' : 'escalated',
}).then(async (ticket) => {
  await ticketService.addSupportTicketReply({
    user: params.user,
    ticketId: params.ticketId,
    message: `Escalation reason: ${params.reason}`,
  });
  return ticket;
});
