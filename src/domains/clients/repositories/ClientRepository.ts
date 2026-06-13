import { supabase } from '../../../lib/supabase';
export const clientRepository = {
  insert: (payload: Record<string, unknown>) => supabase.from('clients').insert([payload]).select('id').single(),
  updateById: (firmId: string, clientId: string, payload: Record<string, unknown>) => supabase.from('clients').update(payload).eq('id', clientId).eq('firm_id', firmId),
  deleteById: (firmId: string, clientId: string) => supabase.from('clients').delete().eq('id', clientId).eq('firm_id', firmId),
  getName: (clientId: string) => supabase.from('clients').select('name').eq('id', clientId).single(),
  listByFirm: (firmId: string) => supabase.from('clients').select('*').eq('firm_id', firmId).order('created_at', { ascending: true }),
  getById: (clientId: string) => supabase.from('clients').select('*').eq('id', clientId).single(),
  countByFirm: (firmId: string) => supabase.from('clients').select('id', { count: 'exact' }).eq('firm_id', firmId),
  listByRisk: (firmId: string, riskLevel: string) => supabase.from('clients').select('*').eq('firm_id', firmId).eq('risk_level', riskLevel).order('name'),
  findByPan: (firmId: string, pan: string) => supabase.from('clients').select('id').eq('firm_id', firmId).eq('pan', pan).maybeSingle(),
  insertAuditLog: (payload: Record<string, unknown>) => supabase.from('audit_logs').insert([payload]),
};
