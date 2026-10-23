import { supabase } from '../lib/supabase';
export interface NoticeMonitorSource { id: string; label: string; kind: string; active: boolean; last_checked_at: string | null; last_error: string | null; check_interval_minutes: number }
export interface NoticeWatch { id: string; client_id: string; department: 'GST' | 'Income Tax'; enabled: boolean }
export interface NoticeIntake { id: string; client_id: string | null; department: 'GST' | 'Income Tax' | null; identifier: string | null; subject: string; body_excerpt: string; notice_number: string | null; issued_date: string | null; deadline: string | null; received_at: string; status: string; evidence_url: string | null }
export interface MonitorClient { id: string; name: string; pan: string; gstin: string | null }
async function readAll(table: string, columns: string, firm: string) {
  const result: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).eq('firm_id', firm).order('id').range(from, from + 999);
    if (error) throw error;
    result.push(...data || []);
    if (!data || data.length < 1000) return result;
  }
}
export async function loadNoticeMonitoring(firm: string) {
  const [sources, watches, clients, inboxResult] = await Promise.all([
    readAll('notice_monitor_sources', 'id,label,kind,active,last_checked_at,last_error,check_interval_minutes', firm),
    readAll('notice_client_watches', 'id,client_id,department,enabled', firm),
    readAll('clients', 'id,name,pan,gstin', firm),
    supabase.from('notice_monitor_inbox').select('id,client_id,department,identifier,subject,body_excerpt,notice_number,issued_date,deadline,received_at,status,evidence_url').eq('firm_id', firm).eq('status', 'Needs Review').order('received_at', { ascending: false }).limit(100),
  ]);
  if (inboxResult.error) throw inboxResult.error;
  return { sources: sources as NoticeMonitorSource[], watches: watches as NoticeWatch[], clients: clients as MonitorClient[], inbox: (inboxResult.data || []) as NoticeIntake[] };
}
export async function saveNoticeWatch(firm: string, client: string, department: string, enabled: boolean) {
  const { error } = await supabase.from('notice_client_watches').upsert({ firm_id: firm, client_id: client, department, enabled }, { onConflict: 'client_id,department' });
  if (error) throw error;
}
export async function provisionNoticeSource(label: string, kind: string): Promise<{ source_id: string; token: string }> {
  const { data, error } = await supabase.rpc('provision_notice_source', { p_label: label, p_kind: kind });
  if (error) throw error;
  return data;
}
export async function setNoticeSourceActive(id: string, active: boolean) {
  const { error } = await supabase.rpc('set_notice_source_active', { p_source: id, p_active: active });
  if (error) throw error;
}
export async function reviewNoticeIntake(id: string, values: { client: string; department: string; number: string; issued: string; deadline: string; dismiss: boolean; note: string }) {
  const { error } = await supabase.rpc('review_notice_intake', { p_id: id, p_client: values.client || null, p_department: values.department || null, p_number: values.number || null, p_issued: values.issued || null, p_deadline: values.deadline || null, p_dismiss: values.dismiss, p_note: values.note });
  if (error) throw error;
}
