import { supabase } from '../../lib/supabase';

export const TicketRepository = {
  listByFirm(firmId: string) {
    return supabase.from('support_tickets').select('*').eq('firm_id', firmId);
  },
};
