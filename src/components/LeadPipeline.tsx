import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { convertLead, createLead, listLeads, updateLead, type Lead } from '../services/crmService';
import { indiaDate } from '../domains/notices/noticeIntelligence';

export default function LeadPipeline({ clients }: { clients: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', next_follow_up: '' });
  const [filter, setFilter] = useState('Open');
  const manager = ['SuperAdmin', 'Admin'].includes(user?.role || '');
  const refresh = useCallback(async () => {
    if (!user?.firmId) return;
    const rows = await listLeads(user.firmId); setLeads(rows); setLoaded(true);
  }, [user?.firmId]);
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, [refresh]);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save lead.'); }
    finally { setBusy(false); }
  }
  const shown = leads.filter(l => filter === 'All' || (filter === 'Open' ? !['Won', 'Lost'].includes(l.stage) : !['Won', 'Lost'].includes(l.stage) && l.next_follow_up && l.next_follow_up <= indiaDate()));
  return <details className="border border-slate-700 rounded-xl p-4 text-slate-300">
    <summary className="cursor-pointer text-gold font-semibold">Lead pipeline · {leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length} open</summary>
    {error && <p role="alert" className="text-red-300 py-2">{error}</p>}
    <p className="text-sm py-3">Track enquiries and follow-ups. Onboard through Add New Client, then link the lead to that client to mark it won.</p>
    {manager && <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void run(async () => { await createLead(user!.firmId!, { ...form, next_follow_up: form.next_follow_up || null }); setForm({ name: '', email: '', phone: '', source: '', next_follow_up: '' }); }); }}>
      {(['name', 'email', 'phone', 'source', 'next_follow_up'] as const).map(key => <label key={key} className="text-xs">{key.replaceAll('_', ' ')}<input required={key === 'name'} aria-label={`Lead ${key}`} className="block bg-slate-900 border border-slate-700 p-2 rounded" type={key === 'email' ? 'email' : key === 'next_follow_up' ? 'date' : 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} disabled={busy} /></label>)}
      <button className="bg-gold text-black px-3 rounded disabled:opacity-50" disabled={busy}>Add lead</button>
    </form>}
    <div className="my-4 flex gap-3"><label>Show <select aria-label="Lead filter" className="bg-slate-900 p-2" value={filter} onChange={e => setFilter(e.target.value)}>{['Open', 'Follow-up due', 'All'].map(x => <option key={x}>{x}</option>)}</select></label><button disabled={busy} onClick={() => void run(refresh)}>Refresh</button></div>
    {!loaded ? <p>Loading leads...</p> : shown.length === 0 ? <p>No leads in this view.</p> : shown.map(lead => <LeadCard key={`${lead.id}-${lead.updated_at}`} lead={lead} clients={clients} disabled={busy || !manager} run={run} />)}
  </details>;
}
function LeadCard({ lead, clients, disabled, run }: { lead: Lead; clients: { id: string; name: string }[]; disabled: boolean; run: (action: () => Promise<unknown>) => Promise<void> }) {
  const [stage, setStage] = useState(lead.stage);
  const [followup, setFollowup] = useState(lead.next_follow_up || '');
  const [notes, setNotes] = useState(lead.notes || '');
  const [client, setClient] = useState('');
  const closed = ['Won', 'Lost'].includes(lead.stage);
  return <article className="border-t border-slate-700 py-4 space-y-2">
    <h4 className="font-semibold text-white">{lead.name} · {lead.stage}</h4><p>{[lead.email, lead.phone, lead.source].filter(Boolean).join(' · ')}</p>
    {lead.client_id && <p>Client: {clients.find(c => c.id === lead.client_id)?.name || 'Linked client'}</p>}
    {!closed && <><div className="flex flex-wrap gap-2">
      <label>Stage <select className="bg-slate-900 p-2" disabled={disabled} value={stage} onChange={e => setStage(e.target.value)}>{['New', 'Contacted', 'Qualified', 'Proposal', 'Lost'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Next follow-up <input className="bg-slate-900 p-2" type="date" disabled={disabled} value={followup} onChange={e => setFollowup(e.target.value)} /></label>
    </div><label className="block">Notes<textarea className="block w-full bg-slate-900 p-2" value={notes} disabled={disabled} onChange={e => setNotes(e.target.value)} /></label>
    <button disabled={disabled} className="text-gold underline mr-4" onClick={() => void run(() => updateLead(lead, { stage, next_follow_up: followup || null, notes }))}>Save follow-up</button>
    <label>Client <select className="bg-slate-900 p-2" value={client} disabled={disabled} onChange={e => setClient(e.target.value)}><option value="">Select onboarded client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <button className="ml-3 text-gold underline disabled:opacity-50" disabled={disabled || !client} onClick={() => void run(() => convertLead(lead.id, client))}>Link client & mark won</button></>}
  </article>;
}
