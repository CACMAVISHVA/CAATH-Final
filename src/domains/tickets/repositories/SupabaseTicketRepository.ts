import { ITicketRepository } from '../../../infrastructure/repositories/interfaces/ITicketRepository';
import { supabase } from '../../../lib/supabase';
import { User } from '../../../types';
import { SupportTicket, SupportTicketReply } from '../dto/ticketDtos';

const TICKET_EVENT_TYPE = 'support_ticket';

const canAccessTicket = (ticket: SupportTicket, user: User) => ticket.createdBy === user.id || ticket.visibilityRoles.includes(user.role);

export class SupabaseTicketRepository implements ITicketRepository {
  async getTickets(user: User): Promise<SupportTicket[]> {
    if (!user.firmId) return [];

    const { data, error } = await supabase
      .from('enterprise_activities')
      .select('id, details')
      .eq('firm_id', user.firmId)
      .eq('event_type', TICKET_EVENT_TYPE)
      .order('created_at', { ascending: false })
      .limit(600);

    if (error) throw error;

    const latestByTicket = new Map<string, SupportTicket>();
    (data || []).forEach((row: any) => {
      const maybeTicket = row?.details?.ticket as SupportTicket | undefined;
      if (!maybeTicket || !maybeTicket.id) return;
      if (!latestByTicket.has(maybeTicket.id)) latestByTicket.set(maybeTicket.id, maybeTicket);
    });

    return Array.from(latestByTicket.values()).filter((ticket) => canAccessTicket(ticket, user));
  }

  async createTicket(ticket: SupportTicket): Promise<void> {
    const { error } = await supabase.from('support_tickets').insert({
      id: ticket.id,
      firm_id: ticket.firmId,
      created_by: ticket.createdBy,
      assigned_to: ticket.assignedToUserId,
      subject: ticket.title,
      description: ticket.description,
      status: 'Open',
      priority: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1),
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
    });

    if (error) throw error;
  }

  async updateTicket(ticket: SupportTicket): Promise<void> {
    const statusByDomainStatus: Record<SupportTicket['status'], string> = {
      open: 'Open',
      investigating: 'In Progress',
      'awaiting-response': 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };

    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: ticket.assignedToUserId,
        status: statusByDomainStatus[ticket.status],
        priority: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1),
        updated_at: ticket.updatedAt,
      })
      .eq('id', ticket.id)
      .eq('firm_id', ticket.firmId);

    if (error) throw error;
  }

  async addReply(_ticket: SupportTicket, _reply: SupportTicketReply, _user: User): Promise<void> {
    return;
  }

  async getTimeline(user: User, ticketId: string): Promise<any[]> {
    if (!user.firmId) return [];

    const { data, error } = await supabase
      .from('enterprise_activities')
      .select('id, event_subtype, actor_id, actor_name, actor_role, details, created_at')
      .eq('firm_id', user.firmId)
      .eq('event_type', TICKET_EVENT_TYPE)
      .eq('reference_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).filter((row: any) => {
      const visibilityRoles = (row?.details?.visibilityRoles || []) as User['role'][];
      return row?.details?.ticket?.createdBy === user.id || visibilityRoles.includes(user.role);
    });
  }
}
