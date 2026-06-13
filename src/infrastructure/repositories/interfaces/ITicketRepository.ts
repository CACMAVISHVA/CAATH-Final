import { SupportTicket, SupportTicketReply } from '../../../domains/tickets/dto/ticketDtos';
import { User } from '../../../types';

export interface ITicketRepository {
  getTickets(user: User): Promise<SupportTicket[]>;
  createTicket(ticket: SupportTicket): Promise<void>;
  updateTicket(ticket: SupportTicket): Promise<void>;
  addReply(ticket: SupportTicket, reply: SupportTicketReply, user: User): Promise<void>;
  getTimeline(user: User, ticketId: string): Promise<any[]>;
}
