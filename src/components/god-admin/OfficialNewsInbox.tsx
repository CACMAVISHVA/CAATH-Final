import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
type Item = { id:string; title:string; source_url:string; authority:string; area:string; published_on:string|null; status:string; review_note:string|null };
type Source = { id:string; label:string; last_success_at:string|null; last_error:string|null; last_imported:number; is_enabled:boolean };
export function OfficialNewsInbox({onPublished}:{onPublished:()=>void}) {
  const [items,setItems]=useState<Item[]>([]),[sources,setSources]=useState<Source[]>([]),[filter,setFilter]=useState('PENDING');
  const [selected,setSelected]=useState<Item|null>(null),[note,setNote]=useState(''),[verified,setVerified]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const lock=useRef(false);
  const editor=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(selected)editor.current?.scrollIntoView({block:'center',behavior:'smooth'});},[selected]);
  const load=useCallback(async()=>{
    const [inbox,health]=await Promise.all([supabase.from('regulatory_news_inbox').select('*').eq('status',filter).order('fetched_at',{ascending:false}).limit(100),supabase.from('regulatory_news_sources').select('*').eq('is_enabled',true).order('label')]);
    if(inbox.error||health.error)throw new Error(inbox.error?.message||health.error?.message);
    setItems(inbox.data||[]);setSources(health.data||[]);
  },[filter]);
  useEffect(()=>{load().catch(e=>setError(e.message));},[load]);
  const act=async(fn:()=>Promise<void>)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{await fn();await load();}catch(e){setError(e instanceof Error?e.message:'Action failed. Please retry.');}finally{lock.current=false;setBusy(false);}
  };
  const fetchNow=()=>act(async()=>{
    const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Please sign in again.');
    const response=await fetch('/api/news-sync',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`},signal:AbortSignal.timeout(65000)});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Collection is available on the deployed site, not this local preview.');
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Collection failed');
    setMessage('Collection checked. Review source health and pending items below. Sources checked within 10 minutes are skipped.');
  });
  const review=(approve:boolean)=>act(async()=>{
    if(!selected||(approve&&!verified))throw new Error('Verify the official source first.');
    if(note.trim().length<10)throw new Error('Enter a note of at least 10 characters.');
    const {error}=await supabase.rpc('review_regulatory_news',{p_id:selected.id,p_approve:approve,p_note:note.trim()});if(error)throw new Error(error.message);
    setSelected(null);setNote('');setVerified(false);setMessage(approve?'Published to all Super Admins.':'Rejected. This item will not be imported again.');if(approve)onPublished();
  });
  return <section aria-label="Official news review inbox" className="space-y-4 rounded-2xl border border-gold/30 bg-matte-black-light p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold text-white">Automatic news inbox</h3><button disabled={busy} onClick={fetchNow} className="rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{busy?'Working…':'Fetch latest now'}</button></div>
    <p className="text-sm text-slate-300">Daily collection from ICAI, RBI, CBIC GST and Customs, CBDT circulars and notifications, and practice-related PIB releases. Nothing is published without your approval. Coverage is limited to these monitored feeds—not every Indian notification or judgment.</p>
    <div className="grid gap-2 md:grid-cols-3">{sources.map(s=><div key={s.id} className="rounded-lg border border-slate-700 p-3 text-xs text-slate-300"><strong>{s.label}</strong><p className="mt-2">Last success: {s.last_success_at?new Date(s.last_success_at).toLocaleString():'Not yet confirmed'}</p>{s.last_error?<p className="mt-1 text-amber-200">Needs attention: {s.last_error}</p>:<p>{s.last_imported} new items at last successful check</p>}</div>)}</div>
    {error&&<p role="alert" className="text-red-200">{error}</p>}{message&&<p role="status" className="text-emerald-200">{message}</p>}
    <label className="block text-sm text-slate-300">Show news<select disabled={busy} value={filter} onChange={e=>{setFilter(e.target.value);setSelected(null);}} className="ml-2 rounded-lg bg-matte-black p-3"><option value="PENDING">Awaiting my review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
    {!items.length&&<p className="text-slate-400">No items in this view. Check source health above for collection gaps.</p>}
    {selected&&<div ref={editor} className="space-y-3 rounded-xl border border-gold/40 p-4"><h4 className="font-bold text-white">Review: {selected.title}</h4><a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="block text-sky-300 underline">Open official source</a><label className="block text-sm text-slate-300">Practice note to publish, or rejection reason<textarea value={note} maxLength={4000} onChange={e=>setNote(e.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-600 bg-matte-black p-3"/></label><label className="flex items-start gap-2 text-sm text-slate-300"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/>I checked the official source, dates and relevance of my note.</label><div className="flex flex-wrap gap-3"><button disabled={busy||!verified||note.trim().length<10} onClick={()=>review(true)} className="rounded-lg bg-emerald-400 px-4 py-3 font-bold text-black disabled:opacity-40">Approve & publish to all</button><button disabled={busy||note.trim().length<10} onClick={()=>review(false)} className="rounded-lg border border-red-400 px-4 py-3 text-red-200 disabled:opacity-40">Reject publication</button><button disabled={busy} onClick={()=>setSelected(null)} className="px-4 py-3 text-slate-300">Cancel</button></div></div>}
    <div className="grid gap-3 lg:grid-cols-2">{items.map(item=><article key={item.id} className="min-w-0 rounded-xl border border-slate-700 p-4"><p className="text-xs text-gold">{item.authority} · {item.area} · {item.published_on||'Date not supplied'}</p><h4 className="my-2 font-semibold text-white">{item.title}</h4><a className="text-sm text-sky-300 underline" href={item.source_url} target="_blank" rel="noopener noreferrer">Read official source (new tab)</a>{item.status==='PENDING'?<button disabled={busy} className="ml-3 rounded-lg border border-gold/40 px-3 py-2 text-sm text-gold" onClick={()=>{setSelected(item);setNote('');setVerified(false);}}>Review item</button>:<p className="mt-2 text-sm text-slate-300">{item.status}: {item.review_note}</p>}</article>)}</div>
    {items.length===100&&<p className="text-amber-200">Showing newest 100. Review these to reach older pending items.</p>}
  </section>;
}
