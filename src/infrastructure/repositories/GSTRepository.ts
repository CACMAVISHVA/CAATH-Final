import { supabase } from '../../lib/supabase';

export const GSTRepository = {
  listReconciliationsByClient(clientId: string) {
    return supabase.from('gst_reconciliations').select('*').eq('client_id', clientId);
  },
};
