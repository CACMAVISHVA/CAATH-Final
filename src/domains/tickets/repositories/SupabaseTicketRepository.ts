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

  async createTicket(_ticket: SupportTicket): Promise<void> {
    return;
  }

  async updateTicket(_ticket: SupportTicket): Promise<void> {
    return;
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
