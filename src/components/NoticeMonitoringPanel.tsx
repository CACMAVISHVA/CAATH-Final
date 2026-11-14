import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadNoticeMonitoring, NoticeIntake, provisionNoticeSource, reviewNoticeIntake, saveNoticeWatch, setNoticeSourceActive } from '../services/noticeMonitoringService';
const field = 'rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100';
const button = 'rounded-lg bg-amber-700 px-3 py-2 text-sm text-white disabled:opacity-50';
type MonitorData = Awaited<ReturnType<typeof loadNoticeMonitoring>>;
export default function NoticeMonitoringPanel({ onAccepted }: { onAccepted: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<MonitorData>({ sources: [], clients: [], watches: [], inbox: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [selected, setSelected] = useState<NoticeIntake | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const admin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  useEffect(() => {
    setToken(''); setSelected(null); setData({ sources: [], clients: [], watches: [], inbox: [] });
    if (!admin || !user?.firmId) return;
    let cancelled = false;
    const refresh = () => loadNoticeMonitoring(user.firmId!).then(value => { if (!cancelled) setData(value); }).catch(err => { if (!cancelled) setError(err.message); });
    void refresh(); const timer = window.setInterval(refresh, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [admin, user?.firmId]);
  useEffect(() => { if (selected && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [selected]);
  async function run(action: () => Promise<void>) {
    if (!user?.firmId) return;
    setBusy(true); setError('');
    try { await action(); setData(await loadNoticeMonitoring(user.firmId)); }
    catch (err) { setError((err as Error).message || 'Unable to save monitoring settings'); }
    finally { setBusy(false); }
  }
  if (!admin) return null;
  const names = new Map(data.clients.map(client => [client.id, client.name]));
  return <section className="space-y-4 rounded-2xl border border-slate-700 p-5 text-slate-100">
    <h3 className="text-lg font-semibold">Notice intake and monitoring</h3>
    <p className="text-sm text-slate-400">Configured sources can detect potential GST/Income Tax notices and alert your team. New connections start paused; a worker or authorised provider must be connected separately. Review the original notice before creating a case. Email coverage depends on notices reaching the monitored mailbox.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-4 text-sm"><span>{data.watches.filter(w => w.enabled).length} client watches</span><span>{data.inbox.length}{data.inbox.length === 100 ? '+' : ''} items awaiting review</span><span>{data.sources.filter(s => s.active).length} enabled sources</span></div>
    <details><summary className="cursor-pointer text-sm font-semibold">Client watches and intake connections</summary>
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); const values = new FormData(e.currentTarget); void run(() => saveNoticeWatch(user!.firmId!, String(values.get('client')), String(values.get('department')), true)); }}>
        <select required name="client" aria-label="Client to monitor" className={field}><option value="">Choose client</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.gstin || c.pan}</option>)}</select>
        <select name="department" aria-label="Department to monitor" className={field}><option>GST</option><option>Income Tax</option></select><button disabled={busy} className={button}>Enable client watch</button>
      </form>
      <div className="mt-3 max-h-48 overflow-y-auto space-y-2">{data.watches.map(w => <div key={w.id} className="flex items-center justify-between gap-3 text-sm"><span>{names.get(w.client_id)} · {w.department} · {w.enabled ? 'Enabled' : 'Paused'}</span><button disabled={busy} className={field} onClick={() => run(() => saveNoticeWatch(user!.firmId!, w.client_id, w.department, !w.enabled))}>{w.enabled ? 'Pause' : 'Enable'}</button></div>)}</div>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); const values = new FormData(e.currentTarget); void run(async () => { const result = await provisionNoticeSource(String(values.get('label')), String(values.get('kind'))); setToken(result.token); }); }}>
        <input name="label" required maxLength={120} aria-label="Connection name" placeholder="Office notices mailbox" className={field} />
        <select name="kind" aria-label="Intake type" className={field}><option value="email">Email worker</option><option value="portal_webhook">Authorised portal/GSP webhook</option></select><button disabled={busy} className={button}>Create intake connection</button>
      </form>
      {token && <div className="mt-3 rounded border border-amber-700 p-3"><p className="text-sm">One-time source token: copy to the worker's protected environment. Do not put it in client code.</p><input readOnly aria-label="One-time intake token" className={`${field} mt-2 w-full font-mono`} value={token} /><button className={`${field} mt-2`} onClick={() => setToken('')}>Hide token</button></div>}
    </details>
    {data.sources.length === 0 && <p className="text-sm text-amber-400">No intake source configured. Automatic discovery is not active.</p>}
    <div className="space-y-2">{data.sources.map(source => {
      const stale = !source.last_checked_at || Date.now() - new Date(source.last_checked_at).getTime() > source.check_interval_minutes * 2 * 60000;
      const state = !source.active ? 'Paused' : source.last_error ? 'Check failed' : !source.last_checked_at ? 'Awaiting first complete check' : stale ? 'Stale — coverage unconfirmed' : 'Recent source check completed';
      return <div key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 text-sm"><div><strong>{source.label}</strong><p className={stale || source.last_error ? 'text-amber-400' : 'text-slate-400'}>{state} · Last check: {source.last_checked_at ? new Date(source.last_checked_at).toLocaleString() : 'Never'}</p></div><button disabled={busy} className={field} onClick={() => run(() => setNoticeSourceActive(source.id, !source.active))}>{source.active ? 'Pause' : 'Enable'}</button></div>;
    })}</div>
    <div className="space-y-2">{data.inbox.map(item => <button key={item.id} disabled={busy} className="block w-full rounded-lg border border-slate-700 p-3 text-left text-sm hover:border-amber-700" onClick={() => setSelected(item)}><strong>{item.client_id ? names.get(item.client_id) : 'Client match needs review'}</strong> · {item.department || 'Department unconfirmed'}<p>{item.subject}</p><p className="text-xs text-slate-400">{item.identifier || 'No GSTIN/PAN extracted'} · {new Date(item.received_at).toLocaleString()}</p></button>)}</div>
    {selected && <dialog ref={dialog} aria-labelledby="notice-review-title" onCancel={e => { if (busy) e.preventDefault(); else setSelected(null); }} className="m-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-slate-950 p-6 text-slate-100 backdrop:bg-black/60">
      <h3 id="notice-review-title" className="font-semibold">Review detected notice</h3>{error && <p role="alert" className="text-red-400">{error}</p>}
      <p className="mt-2 text-sm">{selected.subject}</p><pre className="my-3 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs">{selected.body_excerpt || 'No text extracted; review the original source document.'}</pre>
      {selected.evidence_url && <a className="text-amber-400 underline" href={selected.evidence_url} target="_blank" rel="noreferrer">Open supplied evidence link</a>}
      <form className="grid gap-3" onSubmit={e => { e.preventDefault(); const values = new FormData(e.currentTarget); const dismiss = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'dismiss'; void run(async () => { await reviewNoticeIntake(selected.id, { client: String(values.get('client')), department: String(values.get('department')), number: String(values.get('number')), issued: String(values.get('issued')), deadline: String(values.get('deadline')), note: String(values.get('note')), dismiss }); setSelected(null); onAccepted(); }); }}>
        <label>Client<select required name="client" defaultValue={selected.client_id || ''} className={`${field} w-full`}><option value="">Confirm client</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Department<select required name="department" defaultValue={selected.department || ''} className={`${field} w-full`}><option value="">Confirm department</option><option>GST</option><option>Income Tax</option></select></label>
        <label>Notice reference<input required name="number" defaultValue={selected.notice_number || ''} className={`${field} w-full`} /></label>
        <label>Issue date<input required name="issued" type="date" defaultValue={selected.issued_date || ''} className={`${field} w-full`} /></label>
        <label>Reply deadline<input required name="deadline" type="date" defaultValue={selected.deadline || ''} className={`${field} w-full`} /></label>
        <label>Review note<textarea name="note" className={`${field} w-full`} /></label>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={button}>Confirm and create notice task</button><button disabled={busy} formNoValidate value="dismiss" className={field}>Dismiss</button><button type="button" disabled={busy} className={field} onClick={() => setSelected(null)}>Close</button></div>
      </form>
    </dialog>}
  </section>;
}
