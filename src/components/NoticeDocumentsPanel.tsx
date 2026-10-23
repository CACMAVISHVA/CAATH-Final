import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNoticeDocuments, uploadNoticePdf, getNoticeDocumentUrl, type NoticeDocument } from '../domains/notices/services/noticeDocumentService';

export function NoticeDocumentsPanel({ notice, onAttached }: { notice: { id: string; firm_id: string; status: string }; onAttached: () => void }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<NoticeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setDocuments([]); setError('');
    getNoticeDocuments(notice.id, notice.firm_id).then(rows => { if (active) setDocuments(rows); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [notice.id, notice.firm_id]);
  async function attach(file: File) {
    if (!user || busy) return;
    setBusy(true); setError('');
    try {
      await uploadNoticePdf(file, notice, user);
      setDocuments(await getNoticeDocuments(notice.id, notice.firm_id));
      onAttached();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not attach PDF.'); }
    finally { setBusy(false); }
  }
  async function download(document: NoticeDocument) {
    setBusy(true); setError('');
    try { const url = await getNoticeDocumentUrl(document); const link = window.document.createElement('a'); link.href = url; link.download = document.name; link.rel = 'noreferrer'; link.click(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Download unavailable.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-2 border-t border-slate-700 pt-4">
    <h3 className="font-semibold text-white">Private notice PDFs</h3>
    <p className="text-xs text-slate-400">PDF only, up to 10 MB. Downloads use a link valid for 60 seconds. Attached files are retained for the case audit trail.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {loading ? <p className="text-slate-400">Loading attachments…</p> : documents.length === 0 && !error ? <p className="text-slate-400">No PDFs attached.</p> : null}
    <ul className="space-y-2">{documents.map(d => <li key={d.id}><button disabled={busy} className="text-amber-200 underline disabled:opacity-50" onClick={() => void download(d)}>{d.name} ({Math.ceil(d.file_size / 1024)} KB)</button></li>)}</ul>
    {notice.status !== 'Archived' && <label className="block text-slate-300">Attach PDF<input type="file" accept="application/pdf,.pdf" disabled={busy || loading} className="block mt-2 text-sm" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) void attach(file); }} /></label>}
    {busy && <p role="status" className="text-slate-400">Processing attachment…</p>}
  </section>;
}
