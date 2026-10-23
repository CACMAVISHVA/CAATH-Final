import { supabase } from '../lib/supabase';
import type { NoticeRow } from './noticeService';
export type IntelligenceNotice = NoticeRow & { reply_draft?: string | null; version?: number; filing_reference?: string | null };
export async function saveNoticeIntelligence(notice: IntelligenceNotice, changes: { status: string; assignedTo: string; draft: string; filingReference: string }) {
  const { data, error } = await supabase.rpc('update_notice_intelligence', {
    p_id: notice.id, p_version: notice.version ?? 0, p_status: changes.status,
    p_assigned_to: changes.assignedTo || null, p_draft: changes.draft, p_filing_reference: changes.filingReference || null,
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function getNoticeHistory(noticeId: string) {
  const { data, error } = await supabase.from('notice_history').select('id,event_type,from_status,to_status,created_at').eq('notice_id', noticeId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
