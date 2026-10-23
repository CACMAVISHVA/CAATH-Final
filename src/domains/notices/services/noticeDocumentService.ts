import { supabase } from '../../../lib/supabase';
import type { User } from '../../../types';
import { validateNoticePdf } from '../noticePdf';
type NoticeRow = { id: string; firm_id: string };

export type NoticeDocument = { id: string; name: string; file_size: number; storage_path: string; created_at: string };
export async function getNoticeDocuments(noticeId: string, firmId: string): Promise<NoticeDocument[]> {
  const { data, error } = await supabase.from('notice_documents').select('*').eq('firm_id', firmId).eq('notice_id', noticeId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function uploadNoticePdf(file: File, notice: NoticeRow, user: User) {
  if (user.firmId !== notice.firm_id || !['Admin','SuperAdmin','Staff'].includes(user.role)) throw new Error('Internal workspace access required.');
  await validateNoticePdf(file);
  const id = crypto.randomUUID();
  const path = `${notice.firm_id}/${notice.id}/${id}.pdf`;
  const bucket = supabase.storage.from('notice-documents');
  const upload = await bucket.upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (upload.error) throw new Error(`PDF upload failed: ${upload.error.message}`);
  const { error } = await supabase.from('notice_documents').insert({ id, firm_id: notice.firm_id, notice_id: notice.id,
    name: file.name.slice(0, 255), storage_path: path, file_size: file.size, mime_type: 'application/pdf', uploaded_by: user.id });
  if (error) {
    const cleanup = await bucket.remove([path]);
    throw new Error(`PDF attachment failed: ${error.message}${cleanup.error ? '. The unattached upload needs administrator cleanup.' : ''}`);
  }
}
export async function getNoticeDocumentUrl(document: NoticeDocument) {
  const { data, error } = await supabase.storage.from('notice-documents').createSignedUrl(document.storage_path, 60, { download: document.name });
  if (error) throw error;
  return data.signedUrl;
}
