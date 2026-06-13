import { IGSTRepository } from '../../../infrastructure/repositories/interfaces/IGSTRepository';
import { supabase } from '../../../lib/supabase';
import { GSTRFiling } from '../../../services/gst/gstTypes';

export class SupabaseGSTRepository implements IGSTRepository {
  async getClientsByFirm(firmId: string): Promise<Array<{ id: string; name?: string; gstin?: string | null }>> {
    const { data, error } = await supabase.from('clients').select('id,name,gstin').eq('firm_id', firmId);
    if (error) throw error;
    return data || [];
  }

  async getClientById(clientId: string): Promise<{ id: string; name?: string; gstin?: string | null } | null> {
    const { data, error } = await supabase.from('clients').select('id,name,gstin').eq('id', clientId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async getFilingsByClient(clientId: string): Promise<GSTRFiling[]> {
    const { data, error } = await supabase.from('gstr_filings').select('*').eq('client_id', clientId).order('due_date', { ascending: false });
    if (error) throw error;
    return (data || []) as GSTRFiling[];
  }

  async createFiling(filing: Omit<GSTRFiling, 'id' | 'created_at'>): Promise<GSTRFiling> {
    const { data, error } = await supabase.from('gstr_filings').insert([filing]).select().single();
    if (error) throw error;
    return data as GSTRFiling;
  }

  async getGstr1ByPeriod(clientId: string, period: string) {
    const { data, error } = await supabase.from('gstr1_data').select('*').eq('client_id', clientId).eq('period', period).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getGstr3bByPeriod(clientId: string, period: string) {
    const { data, error } = await supabase.from('gstr3b_data').select('*').eq('client_id', clientId).eq('period', period).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getPurchaseInvoices(clientId: string, period: string) {
    const { data, error } = await supabase.from('purchase_register').select('*').eq('client_id', clientId).like('invoice_date', `${period}%`);
    if (error) throw error;
    return data || [];
  }

  async getGstr2bInvoices(clientId: string, period: string) {
    const start = `${period}-01`;
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('gst_invoices')
      .select('invoice_no, supplier_gstin, taxable_value, tax_amount, total_amount')
      .eq('client_id', clientId)
      .eq('source', 'GSTR2B')
      .gte('invoice_date', start)
      .lte('invoice_date', end);
    if (error) throw error;
    return data || [];
  }
}
