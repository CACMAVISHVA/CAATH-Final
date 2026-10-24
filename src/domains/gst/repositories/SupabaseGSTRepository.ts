import { IGSTRepository } from '../../../infrastructure/repositories/interfaces/IGSTRepository';
import { supabase } from '../../../lib/supabase';
import { GSTRFiling } from '../../../services/gst/gstTypes';

const isUnavailableOptionalGSTSource = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === 'PGRST205'
    || candidate.message?.toLowerCase().includes('schema cache') === true;
};

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
    if (isUnavailableOptionalGSTSource(error)) return [];
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
    if (isUnavailableOptionalGSTSource(error)) return null;
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getGstr3bByPeriod(clientId: string, period: string) {
    const { data, error } = await supabase.from('gstr3b_data').select('*').eq('client_id', clientId).eq('period', period).single();
    if (isUnavailableOptionalGSTSource(error)) return null;
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getPurchaseInvoices(clientId: string, period: string) {
    const start = `${period}-01`;
    const startDate = new Date(`${start}T00:00:00Z`);
    if (Number.isNaN(startDate.getTime())) throw new Error('GST filing period must use YYYY-MM format.');
    const end = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('purchase_register')
      .select('*')
      .eq('client_id', clientId)
      .gte('invoice_date', start)
      .lte('invoice_date', end);
    if (isUnavailableOptionalGSTSource(error)) return [];
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
    if (isUnavailableOptionalGSTSource(error)) return [];
    if (error) throw error;
    return data || [];
  }
}
