import { supabase } from '../lib/supabase';
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
  const [suggestion, setSuggestion] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
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
  async function generateDraft() {
    if (busy) return;
    setBusy(true); setError(''); setSuggestion('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Sign in again.');
      const response = await fetch('/api/notice-draft', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ noticeId: notice.id, provider: 'gemini', apiKey: aiKey, model: aiModel, consent: aiConsent }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Draft generation failed.');
      if (result.noticeVersion !== (notice.version ?? 0)) throw new Error('The case changed. Reload before generating a draft.');
      if (typeof result.draft !== 'string') throw new Error('Invalid draft response.');
      setSuggestion(result.draft);
    } catch (e) { setError(e instanceof Error ? e.message : 'Draft generation failed.'); }
    finally { setBusy(false); setAiKey(''); setAiConsent(false); }
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
    <section aria-label="Use your own AI" className="space-y-3 rounded border border-slate-700 p-4">
      <h3 className="text-white font-semibold">Use your own AI (optional)</h3>
      <p className="text-sm text-slate-300">Connect your Google Gemini API account. Your provider bills your account directly; CAATH does not supply AI credits. Manual drafting is always available.</p>
      <label className="block text-slate-300">Your Gemini API key<input type="password" autoComplete="off" spellCheck={false} className={field} value={aiKey} disabled={!editable || busy} onChange={e => setAiKey(e.target.value)} /></label>
      <label className="block text-slate-300">Model ID from your provider account<input className={field} value={aiModel} maxLength={100} disabled={!editable || busy} onChange={e => setAiModel(e.target.value)} /></label>
      <p className="text-xs text-slate-400">The key is sent securely through CAATH for this request, is not saved to your workspace or browser storage, and is cleared after the request. Closing this box clears it too.</p>
      <label className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={aiConsent} disabled={!editable || busy} onChange={e => setAiConsent(e.target.checked)} />I authorize sending the saved notice summary, reference and dates to Google using my account, subject to its terms and charges. PDFs are not sent.</label>
      <button className="border border-amber-700 rounded px-3 py-2 text-amber-200 disabled:opacity-50" disabled={!editable || busy || !aiKey.trim() || !aiModel.trim() || !aiConsent} onClick={() => void generateDraft()}>Generate with my AI account</button>
      <p className="text-xs text-amber-200">Review generated text professionally before saving. Nothing is filed automatically.</p>
    </section>
    {suggestion && <section className="space-y-2 rounded border border-amber-700 p-3"><h3 className="text-white font-semibold">AI suggestion — not saved</h3><pre className="whitespace-pre-wrap text-sm text-slate-300">{suggestion}</pre><button className="text-amber-200 underline" onClick={() => { setForm({ ...form, draft: [form.draft, suggestion].filter(Boolean).join('\n\n') }); setSuggestion(''); }}>Append suggestion to reply for editing</button><button className="ml-4 text-slate-300 underline" onClick={() => setSuggestion('')}>Discard suggestion</button></section>}
    <label className="block text-slate-300">Manual filing acknowledgement<input className={field} value={form.filingReference} disabled={!editable || !manager || busy} onChange={e => setForm({ ...form, filingReference: e.target.value })} /></label>
    <button className="bg-gold text-black px-4 py-2 rounded disabled:opacity-50" disabled={!editable || busy} onClick={save}>{busy ? 'Saving...' : 'Save case'}</button>
    <NoticeDocumentsPanel notice={notice} onAttached={() => { void getNoticeHistory(notice.id).then(setHistory).catch(e => setError(e.message)); }} />
    <h3 className="text-white font-semibold">Case activity</h3>
    {historyLoading && <p className="text-slate-400">Loading case activity…</p>}
    {!historyLoading && history.length === 0 && <p className="text-slate-400">No recorded activity yet.</p>}
    <ul className="text-slate-300 space-y-2">{history.map(h => <li key={h.id}>{h.event_type}: {h.to_status?.replaceAll('_', ' ')} · {new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>)}</ul>
  </Modal>;
}
