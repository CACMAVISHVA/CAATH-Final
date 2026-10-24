import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { PlatformRegulatoryUpdate, listPlatformRegulatoryUpdates } from '../services/platformRegulatoryUpdatesService';

const PublishedRegulatoryUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<PlatformRegulatoryUpdate[]>([]); const [error, setError] = useState<string | null>(null);
  useEffect(() => { listPlatformRegulatoryUpdates(true).then(setUpdates).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load updates.')); }, []);
  return <div className="h-full overflow-y-auto bg-matte-black px-5 py-6 lg:px-8"><div className="mx-auto max-w-6xl space-y-6 pb-10">
    <section className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-matte-black-light to-matte-black p-6"><div className="flex items-center gap-3 text-gold"><ShieldCheck className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[0.18em]">CAATH verified platform updates</p></div><h1 className="mt-3 text-3xl font-bold text-white">Regulatory Updates</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Updates here are centrally verified and published by CAATH God Admin for Super Admins. Always open the official source and verify applicability before acting.</p></section>
    {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{updates.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No platform updates have been published yet.</p> : updates.map((item) => <article key={item.id} className="flex min-h-64 flex-col rounded-2xl border border-slate-800 bg-matte-black-light/70 p-5"><span className="text-xs font-bold uppercase tracking-wide text-gold">{item.area}</span><p className="mt-4 text-xs font-semibold text-slate-400">{item.authority}{item.published_on ? ` · ${item.published_on}` : ''}</p><h2 className="mt-2 text-lg font-bold leading-6 text-white">{item.title}</h2><p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{item.summary}</p>{item.effective_on && <p className="mt-3 text-xs text-amber-200">Effective: {item.effective_on}</p>}<p className="mt-3 text-xs text-emerald-200">Verified by CAATH God Admin</p><a href={item.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-gold-light">{item.source_label}<ArrowUpRight className="h-4 w-4" /></a></article>)}</section>
  </div></div>;
};
export default PublishedRegulatoryUpdates;
