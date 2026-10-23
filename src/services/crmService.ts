import { supabase } from '../lib/supabase';
export type Lead = { id: string; name: string; email: string | null; phone: string | null; source: string | null; notes: string | null; stage: string; next_follow_up: string | null; client_id: string | null; updated_at: string };
export async function listLeads(firmId: string): Promise<Lead[]> {
  const { data, error } = await supabase.from('crm_leads').select('*').eq('firm_id', firmId).order('next_follow_up', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function createLead(firmId: string, input: { name: string; email: string; phone: string; source: string; next_follow_up: string | null }) {
  if (!input.name.trim()) throw new Error('Lead name is required.');
  const { error } = await supabase.from('crm_leads').insert({ ...input, name: input.name.trim(), firm_id: firmId });
  if (error) throw new Error(error.message);
}
export async function updateLead(lead: Lead, changes: { stage: string; next_follow_up: string | null; notes: string }) {
  const { data, error } = await supabase.from('crm_leads').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', lead.id).eq('updated_at', lead.updated_at).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Lead changed or is unavailable. Refresh before saving.');
}
export async function convertLead(leadId: string, clientId: string) {
  const { error } = await supabase.rpc('convert_crm_lead', { p_lead_id: leadId, p_client_id: clientId });
  if (error) throw new Error(error.message);
}
