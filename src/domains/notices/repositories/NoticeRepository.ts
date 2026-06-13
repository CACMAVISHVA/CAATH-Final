import { supabase } from '../../../lib/supabase';

export const noticeRepository = {
  insertAuditLog(payload: Record<string, unknown>) {
    return supabase.from('audit_logs').insert([payload]);
  },
  createNotice(payload: Record<string, unknown>) {
    return supabase.from('notices').insert([payload]).select('id').single();
  },
  updateNotice(noticeId: string, payload: Record<string, unknown>) {
    return supabase.from('notices').update(payload).eq('id', noticeId);
  },
  deleteNotice(noticeId: string) {
    return supabase.from('notices').delete().eq('id', noticeId);
  },
  getNoticeStatus(noticeId: string) {
    return supabase.from('notices').select('status').eq('id', noticeId).maybeSingle();
  },
  listNoticesByFirm(firmId: string) {
    return supabase.from('notices').select('*, clients(name)').eq('firm_id', firmId).order('received_date', { ascending: false });
  },
  getNoticeById(noticeId: string) {
    return supabase.from('notices').select('*, clients(name)').eq('id', noticeId).single();
  },
  listNoticeStatsRows(firmId: string) {
    return supabase.from('notices').select('status, deadline').eq('firm_id', firmId);
  },
  listActiveNoticeStaff(firmId: string) {
    return supabase.from('users').select('id, name, email').eq('firm_id', firmId).in('role', ['Admin', 'Staff']).eq('status', 'Active').order('name');
  },
};
