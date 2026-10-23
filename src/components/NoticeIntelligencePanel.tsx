import React, { useEffect, useState } from 'react';
import { NoticeDocumentsPanel } from './NoticeDocumentsPanel';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { noticeTransitions } from '../domains/notices/noticeIntelligence';
import { getNoticeHistory, saveNoticeIntelligence, type IntelligenceNotice } from '../services/noticeIntelligenceService';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

export function NoticeIntelligencePanel({ notice, staff, onClose, onSaved }: { notice: IntelligenceNotice; staff: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const initial = { status: notice.status as string, assignedTo: notice.assigned_to || '', draft: notice.reply_draft || '', filingReference: notice.filing_reference || '' };
  const [form, setForm] = useState(initial);
  const [history, setHistory] = useState<{ id: string; event_type: string; to_status: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const guardClose = useUnsavedChangesGuard(JSON.stringify(form) !== JSON.stringify(initial));
  const manager = ['Admin', 'SuperAdmin'].includes(user?.role || '');
  const editable = ['Admin', 'SuperAdmin', 'Staff'].includes(user?.role || '') && notice.status !== 'Archived';
  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    getNoticeHistory(notice.id).then(rows => { if (active) setHistory(rows); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [notice.id]);
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try { await saveNoticeIntelligence(notice, form); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save the notice.'); }
    finally { setBusy(false); }
  }
  const field = 'block w-full p-3 mt-1 bg-slate-900 border border-slate-700 rounded text-white';
  return <Modal isOpen onClose={() => { if (!busy) guardClose(onClose); }} title={`Notice ${notice.notice_number}`} size="lg" contentClassName="p-6 space-y-4">
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <p className="text-slate-400">{notice.description || 'No notice summary recorded.'}</p>
    <p className="text-amber-200 text-sm">Manual case tracking. Saving a draft or recording a filing does not submit anything to a tax portal.</p>
    <label className="block text-slate-300">Status<select className={field} value={form.status} disabled={!editable || busy} onChange={e => setForm({ ...form, status: e.target.value })}>
      {[notice.status, ...(noticeTransitions[notice.status] || []).filter(s => manager || !['Filed', 'Closed', 'Archived'].includes(s))].map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
    </select></label>
    <label className="block text-slate-300">Owner<select className={field} value={form.assignedTo} disabled={!editable || !manager || busy} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
      <option value="">Unassigned</option>{notice.assigned_to && !staff.some(s => s.id === notice.assigned_to) && <option value={notice.assigned_to}>Current owner</option>}{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>
    <label className="block text-slate-300">Reply draft<textarea className={field} rows={8} value={form.draft} disabled={!editable || busy} onChange={e => setForm({ ...form, draft: e.target.value })} placeholder="Record facts, issues, supporting documents and the proposed response for professional review." /></label>
    <p className="text-xs text-slate-400">AI drafting is not connected yet. Draft text must be reviewed by the responsible professional.</p>
    <label className="block text-slate-300">Manual filing acknowledgement<input className={field} value={form.filingReference} disabled={!editable || !manager || busy} onChange={e => setForm({ ...form, filingReference: e.target.value })} /></label>
    <button className="bg-gold text-black px-4 py-2 rounded disabled:opacity-50" disabled={!editable || busy} onClick={save}>{busy ? 'Saving...' : 'Save case'}</button>
    <NoticeDocumentsPanel notice={notice} onAttached={() => { void getNoticeHistory(notice.id).then(setHistory).catch(e => setError(e.message)); }} />
    <h3 className="text-white font-semibold">Case activity</h3>
    {historyLoading && <p className="text-slate-400">Loading case activity…</p>}
    {!historyLoading && history.length === 0 && <p className="text-slate-400">No recorded activity yet.</p>}
    <ul className="text-slate-300 space-y-2">{history.map(h => <li key={h.id}>{h.event_type}: {h.to_status?.replaceAll('_', ' ')} · {new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>)}</ul>
  </Modal>;
}
