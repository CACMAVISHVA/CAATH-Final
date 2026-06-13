import { enforceClientRateLimit, requireString, requireUuid } from '../../../security';
import { User, UserRole } from '../../../types';
import { publishEnterpriseEvent } from '../../../services/enterpriseEventBusService';
import { logEnterpriseActivity } from '../../../services/observabilityService';
import { SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketReply, SupportTicketStatus } from '../dto/ticketDtos';
import { SupabaseTicketRepository } from '../repositories/SupabaseTicketRepository';

const repository = new SupabaseTicketRepository();
const TICKET_EVENT_TYPE = 'support_ticket';

const byRoleVisibility = (role: UserRole): UserRole[] => {
  if (role === 'Staff') return ['Staff', 'Admin', 'SuperAdmin', 'GodAdmin'];
  if (role === 'Admin') return ['Admin', 'SuperAdmin', 'GodAdmin'];
  if (role === 'SuperAdmin') return ['SuperAdmin', 'GodAdmin'];
  if (role === 'GodAdmin') return ['GodAdmin'];
  return ['Client'];
};

export const ticketService = {
  async createSupportTicket(params: {
    user: User;
    category: SupportTicketCategory;
    title: string;
    description: string;
    priority?: SupportTicketPriority;
    assignedToUserId?: string | null;
    escalationState?: 'none' | 'escalated' | 'governance-review';
  }) {
    requireUuid(params.user.id, 'user.id');
    requireString(params.title, 'title', 200);
    requireString(params.description, 'description', 4000);
    enforceClientRateLimit(`support:create:${params.user.id}`, 20, 60_000);
    if (!params.user.firmId) throw new Error('Firm context is required.');

    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: crypto.randomUUID(),
      firmId: params.user.firmId,
      createdBy: params.user.id,
      createdByName: params.user.name,
      createdByRole: params.user.role,
      category: params.category,
      title: params.title,
      description: params.description,
      priority: params.priority || 'medium',
      status: 'open',
      assignedToUserId: params.assignedToUserId || null,
      visibilityRoles: byRoleVisibility(params.user.role),
      escalationState: params.escalationState || 'none',
      createdAt: now,
      updatedAt: now,
    };

    await logEnterpriseActivity({
      firm_id: params.user.firmId,
      event_type: TICKET_EVENT_TYPE,
      event_subtype: 'created',
      reference_id: ticket.id,
      reference_table: 'support_tickets',
      actor_id: params.user.id,
      actor_name: params.user.name,
      actor_role: params.user.role,
      severity: ticket.priority === 'critical' ? 'critical' : ticket.priority === 'high' ? 'warning' : 'notice',
      details: { ticket, visibilityRoles: ticket.visibilityRoles, clientVisible: false },
    } as any);

    await publishEnterpriseEvent({
      eventName: 'workflow_transitioned',
      firmId: params.user.firmId,
      sourceService: 'ticketService.createSupportTicket',
      actor: { id: params.user.id, name: params.user.name, role: params.user.role },
      workflowType: 'support_tickets',
      workflowId: ticket.id,
      payload: { status: 'open', priority: ticket.priority, category: ticket.category, visibilityRoles: ticket.visibilityRoles },
    });

    return ticket;
  },

  getSupportTickets(user: User) {
    return repository.getTickets(user);
  },

  async updateSupportTicketStatus(params: { user: User; ticketId: string; status: SupportTicketStatus; assignedToUserId?: string | null; escalationState?: 'none' | 'escalated' | 'governance-review' }) {
    requireUuid(params.user.id, 'user.id');
    requireUuid(params.ticketId, 'ticketId');
    const tickets = await repository.getTickets(params.user);
    const ticket = tickets.find((t) => t.id === params.ticketId);
    if (!ticket || !params.user.firmId) throw new Error('Ticket not found or inaccessible.');

    const updated: SupportTicket = {
      ...ticket,
      status: params.status,
      assignedToUserId: params.assignedToUserId === undefined ? ticket.assignedToUserId : params.assignedToUserId,
      escalationState: params.escalationState || ticket.escalationState,
      updatedAt: new Date().toISOString(),
    };

    await logEnterpriseActivity({
      firm_id: params.user.firmId,
      event_type: TICKET_EVENT_TYPE,
      event_subtype: 'status_updated',
      reference_id: ticket.id,
      reference_table: 'support_tickets',
      actor_id: params.user.id,
      actor_name: params.user.name,
      actor_role: params.user.role,
      severity: updated.priority === 'critical' ? 'critical' : updated.priority === 'high' ? 'warning' : 'notice',
      details: { ticket: updated, visibilityRoles: ticket.visibilityRoles, previousStatus: ticket.status, clientVisible: false },
    } as any);

    return updated;
  },

  async addSupportTicketReply(params: { user: User; ticketId: string; message: string }) {
    requireUuid(params.user.id, 'user.id');
    requireUuid(params.ticketId, 'ticketId');
    requireString(params.message, 'message', 4000);

    const tickets = await repository.getTickets(params.user);
    const ticket = tickets.find((t) => t.id === params.ticketId);
    if (!ticket || !params.user.firmId) throw new Error('Ticket not found or inaccessible.');

    const reply: SupportTicketReply = {
      id: crypto.randomUUID(),
      ticketId: ticket.id,
      message: params.message,
      actorId: params.user.id,
      actorName: params.user.name,
      actorRole: params.user.role,
      createdAt: new Date().toISOString(),
    };

    await logEnterpriseActivity({
      firm_id: params.user.firmId,
      event_type: TICKET_EVENT_TYPE,
      event_subtype: 'reply_added',
      reference_id: ticket.id,
      reference_table: 'support_tickets',
      actor_id: params.user.id,
      actor_name: params.user.name,
      actor_role: params.user.role,
      severity: 'notice',
      details: { ticket, reply, visibilityRoles: ticket.visibilityRoles, clientVisible: false },
    } as any);

    return reply;
  },

  getSupportTicketTimeline(params: { user: User; ticketId: string }) {
    return repository.getTimeline(params.user, params.ticketId);
  },
};
