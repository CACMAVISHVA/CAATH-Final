import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, ClipboardCheck, ExternalLink, FilePlus2, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RegulatoryArea, RegulatoryStatus, RegulatoryUpdateDraft, RegulatoryUpdateRecord, archiveRegulatoryUpdate, createRegulatoryUpdate, listRegulatoryUpdates, publishRegulatoryUpdate } from '../services/regulatoryUpdatesService';

const AREAS: RegulatoryArea[] = ['GST', 'Direct Tax', 'Company Law', 'Financial Regulation', 'Professional Practice'];
const STATUS_STYLE: Record<RegulatoryStatus, string> = { DRAFT: 'border-amber-400/30 bg-amber-400/10 text-amber-200', PUBLISHED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', ARCHIVED: 'border-slate-600 bg-slate-800 text-slate-300' };
const EMPTY: RegulatoryUpdateDraft = { area: 'GST', authority: '', title: '', summary: '', source_url: '', source_label: '', published_on: '', effective_on: '' };
const SOURCES = [
  ['GST / CBIC', 'Central Tax notifications and CGST circulars', 'https://cbic-gst.gov.in/hindi/central-tax-notifications.html'],
  ['Direct Tax / CBDT', 'Income Tax Department latest news', 'https://www.incometax.gov.in/iec/foportal/latest-news'],
  ['Company Law / MCA', 'MCA notifications and updates', 'https://www.mca.gov.in/'],
  ['Financial regulation / RBI', 'RBI notification register', 'https://www.rbi.org.in/Scripts/NotificationUser.aspx'],
  ['Professional practice / ICAI', 'ICAI notifications', 'https://www.icai.org/category/notifications'],
];

const RegulatoryUpdatesCenter: React.FC = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<RegulatoryUpdateRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | RegulatoryStatus>('ALL');
  const [draft, setDraft] = useState<RegulatoryUpdateDraft>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user?.firmId) return;
    setLoading(true); setError(null);
    try { setUpdates(await listRegulatoryUpdates(user.firmId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load regulatory updates.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user?.firmId]);
  const visible = useMemo(() => filter === 'ALL' ? updates : updates.filter((item) => item.status === filter), [filter, updates]);
  const change = <K extends keyof RegulatoryUpdateDraft>(key: K, value: RegulatoryUpdateDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!user?.firmId || !user.id) return;
    setSaving(true); setError(null);
    try {
      const saved = await createRegulatoryUpdate(user.firmId, user.id, { ...draft, published_on: draft.published_on || null, effective_on: draft.effective_on || null });
      setUpdates((current) => [saved, ...current]); setDraft(EMPTY); setShowForm(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save draft.'); }
    finally { setSaving(false); }
  };
  const publish = async (id: string) => {
    if (!user?.id) return; setSaving(true); setError(null);
    try { const saved = await publishRegulatoryUpdate(id, user.id); setUpdates((current) => current.map((item) => item.id === id ? saved : item)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to publish update.'); }
    finally { setSaving(false); }
  };
  const archive = async (id: string) => {
    setSaving(true); setError(null);
    try { const saved = await archiveRegulatoryUpdate(id); setUpdates((current) => current.map((item) => item.id === id ? saved : item)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to archive update.'); }
    finally { setSaving(false); }
  };

  return <div className="h-full overflow-y-auto bg-matte-black px-5 py-6 lg:px-8"><div className="mx-auto max-w-6xl space-y-6 pb-10">
    <section className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-matte-black-light to-matte-black p-6 shadow-2xl lg:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold"><ShieldCheck className="h-4 w-4" /> Super Admin private desk</div><h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Regulatory Updates</h1><p className="mt-3 text-sm leading-6 text-slate-300">A verified review queue for your firm’s GST, tax, company-law, RBI and ICAI updates. Draft first, check the original source, then publish.</p></div><button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-matte-black hover:bg-gold-light"><Plus className="h-4 w-4" /> Add verified update</button></div></section>
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><p><span className="font-semibold">Practice safeguard:</span> This is an evidence-linked awareness tool, not legal advice. Verify the original notification, Gazette publication, effective date, state-specific position and client facts before acting.</p></div></section>
    {showForm && <form onSubmit={save} className="space-y-4 rounded-2xl border border-gold/30 bg-matte-black-light p-5"><div className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-gold" /><h2 className="font-bold text-white">New verified update</h2></div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-300">Area<select required value={draft.area} onChange={(e) => change('area', e.target.value as RegulatoryArea)} className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white">{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label><label className="text-sm text-slate-300">Authority<input required value={draft.authority} onChange={(e) => change('authority', e.target.value)} placeholder="e.g. CBIC" className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label><label className="text-sm text-slate-300 md:col-span-2">Title<input required value={draft.title} onChange={(e) => change('title', e.target.value)} placeholder="Exact, plain-language update title" className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label><label className="text-sm text-slate-300 md:col-span-2">Practice note<textarea required value={draft.summary} onChange={(e) => change('summary', e.target.value)} placeholder="Brief factual note; do not add legal conclusions." className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Official source URL<input required type="url" value={draft.source_url} onChange={(e) => change('source_url', e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Source button label<input required value={draft.source_label} onChange={(e) => change('source_label', e.target.value)} placeholder="Open official notification" className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Published date<input type="date" value={draft.published_on || ''} onChange={(e) => change('published_on', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Effective date (if known)<input type="date" value={draft.effective_on || ''} onChange={(e) => change('effective_on', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-matte-black px-3 py-2 text-white" /></label></div><div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-matte-black disabled:opacity-60">Save as draft</button><button type="button" onClick={() => { setShowForm(false); setDraft(EMPTY); }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Cancel</button></div></form>}
    {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
    <section className="flex flex-wrap gap-2">{(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === status ? 'border-gold bg-gold text-matte-black' : 'border-slate-700 bg-matte-black-light text-slate-300'}`}>{status === 'ALL' ? 'All updates' : status[0] + status.slice(1).toLowerCase()}</button>)}</section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loading ? <p className="text-slate-400">Loading your review queue…</p> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No {filter === 'ALL' ? '' : filter.toLowerCase()} updates yet. Use the official sources below, then add the first verified draft.</div> : visible.map((item) => <article key={item.id} className="flex min-h-64 flex-col rounded-2xl border border-slate-800 bg-matte-black-light/70 p-5"><div className="flex items-start justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide text-gold">{item.area}</span><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${STATUS_STYLE[item.status]}`}>{item.status}</span></div><p className="mt-4 text-xs font-semibold text-slate-400">{item.authority}{item.published_on ? ` · ${item.published_on}` : ''}</p><h2 className="mt-2 text-lg font-bold leading-6 text-white">{item.title}</h2><p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{item.summary}</p>{item.effective_on && <p className="mt-3 text-xs text-amber-200">Effective: {item.effective_on}</p>}{item.reviewed_at && <p className="mt-2 text-xs text-emerald-200">Reviewed and published {new Date(item.reviewed_at).toLocaleDateString('en-IN')}</p>}<a href={item.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-gold-light">{item.source_label}<ArrowUpRight className="h-4 w-4" /></a><div className="mt-4 flex gap-2">{item.status === 'DRAFT' && <button disabled={saving} onClick={() => publish(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-matte-black disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" />Review & publish</button>}{item.status !== 'ARCHIVED' && <button disabled={saving} onClick={() => archive(item.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-60">Archive</button>}</div></article>)}</section>
    <section className="rounded-2xl border border-slate-800 bg-matte-black-light/70 p-5"><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-gold" /><div><h2 className="font-bold text-white">Official source desk</h2><p className="mt-1 text-sm text-slate-400">Use these primary sources to identify an update. Add it to CAATH only after your review.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{SOURCES.map(([authority, label, url]) => <a key={authority} href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 p-4 hover:border-gold/40"><p className="text-xs font-bold uppercase tracking-wide text-gold">{authority}</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-200">{label}<ExternalLink className="h-3.5 w-3.5" /></p></a>)}</div></section>
  </div></div>;
};
export default RegulatoryUpdatesCenter;
