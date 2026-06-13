import { supabase } from '../../lib/supabase';

export const BillingRepository = {
  listInvoicesByFirm(firmId: string) {
    return supabase.from('invoices').select('*').eq('firm_id', firmId);
  },
};
