import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, FileCheck2, Landmark, PlugZap, Plus, RefreshCw, Scale, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ChallanStatus, createFilingWorkpaper, createGSTChallan, createGSTLitigation, FilingStatus,
  GSTChallan, GSTClientOption, GSTLitigation, FilingWorkpaper, LitigationStatus,
  loadGSTComplianceLifecycle, updateLifecycleStatus,
} from '../services/gstComplianceLifecycleService';
import { GspConnection, GspPlatformStatus, grantGspSandboxConsent, loadGspIntegrationReadiness, revokeGspConsent } from '../services/gspIntegrationService';

type View = 'filings' | 'challans' | 'litigation';
const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-gold';
const statusClass = (status: string) => status === 'Filed' || status === 'Paid' || status === 'Closed'
  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
  : status === 'Ready to File' || status === 'Generated'
    ? 'border-gold/30 bg-gold/10 text-gold-light'
    : 'border-slate-700 bg-slate-800 text-slate-300';

const GSTComplianceLifecycle: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<View>('filings');
  const [clients, setClients] = useState<GSTClientOption[]>([]);
  const [filings, setFilings] = useState<FilingWorkpaper[]>([]);
  const [challans, setChallans] = useState<GSTChallan[]>([]);
  const [litigation, setLitigation] = useState<GSTLitigation[]>([]);
  const [clientId, setClientId] = useState('');
  const [period, setPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [gspPlatform, setGspPlatform] = useState<GspPlatformStatus | null>(null);
  const [gspConnections, setGspConnections] = useState<GspConnection[]>([]);
  const [gspProvider, setGspProvider] = useState('IRIS');
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  const load = useCallback(async () => {
    if (!user?.firmId) return;
    setBusy(true);
    try {
      const [data, gsp] = await Promise.all([loadGSTComplianceLifecycle(user.firmId), loadGspIntegrationReadiness(user.firmId)]);
      setClients(data.clients); setFilings(data.filings); setChallans(data.challans); setLitigation(data.litigation);
      setGspPlatform(gsp.platform); setGspConnections(gsp.connections);
      if (data.clients[0]) setClientId((current) => current || data.clients[0].id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load GST lifecycle.'); }
    finally { setBusy(false); }
  }, [user?.firmId]);
  useEffect(() => { void load(); }, [load]);

  const client = clients.find((item) => item.id === clientId);
  const overdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return filings.filter((item) => item.due_date && item.due_date < today && item.status !== 'Filed').length
      + challans.filter((item) => item.due_date && item.due_date < today && item.status !== 'Paid').length
      + litigation.filter((item) => item.response_due_date && item.response_due_date < today && item.status !== 'Closed').length;
  }, [filings, challans, litigation]);
  const metrics = [
    { value: filings.length, label: 'Return workpapers', icon: FileCheck2 },
    { value: challans.length, label: 'Challans tracked', icon: Landmark },
    { value: litigation.filter((item) => item.status !== 'Closed').length, label: 'Open cases', icon: Scale },
    { value: overdue, label: 'Overdue actions', icon: AlertTriangle },
  ];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !client) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setMessage('');
    try {
      if (view === 'filings') await createFilingWorkpaper(user, { client, returnType: String(data.get('returnType')), frequency: String(data.get('frequency')), taxPeriod: period, dueDate });
      if (view === 'challans') await createGSTChallan(user, { client, taxPeriod: period, purpose: String(data.get('purpose')), amount: Number(data.get('amount')), dueDate });
      if (view === 'litigation') await createGSTLitigation(user, { client, caseNumber: String(data.get('caseNumber')), forum: String(data.get('forum')), stage: String(data.get('stage')), responseDueDate: dueDate, amountDisputed: Number(data.get('amount')), ownerName: String(data.get('ownerName')) });
      form.reset(); setPeriod(''); setDueDate(''); setMessage('Saved to the GST compliance lifecycle.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save this record.'); }
    finally { setBusy(false); }
  };

  const changeStatus = async (table: 'gst_filing_workpapers' | 'gst_challan_register' | 'gst_litigation_cases', id: string, status: string) => {
    setBusy(true); setMessage('');
    try { await updateLifecycleStatus(table, id, status); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update status.'); }
    finally { setBusy(false); }
  };

  const grantConsent = async () => {
    if (!user || !client || !consentConfirmed) return;
    setBusy(true); setMessage('');
    try { await grantGspSandboxConsent(user, client, gspProvider); setConsentConfirmed(false); setMessage('Sandbox consent recorded. Connection remains blocked until the GSP is contracted and configured.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record GST API consent.'); }
    finally { setBusy(false); }
  };

  const revokeConsent = async (id: string) => {
    setBusy(true); setMessage('');
    try { await revokeGspConsent(id); setMessage('GST API consent revoked.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to revoke consent.'); }
    finally { setBusy(false); }
  };

  if (!user?.firmId) return <div className="p-8 text-slate-400">A firm workspace is required.</div>;
  return <div className="h-full space-y-6 overflow-y-auto bg-matte-black p-4 text-slate-200 sm:p-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">GST lifecycle command centre</p><h2 className="mt-2 text-3xl font-black text-white">Returns, Challans & Litigation</h2><p className="mt-2 max-w-3xl text-sm text-slate-400">Prepare and control multi-client GST work from reconciliation through filing readiness, payment tracking and litigation closure.</p></div>
      <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold hover:border-gold"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`}/>Refresh</button>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ value, label, icon: Icon }) => <div key={label} className="premium-surface p-4"><Icon className="h-5 w-5 text-gold"/><p className="mt-3 text-3xl font-black text-white">{value}</p><p className="text-sm text-slate-500">{label}</p></div>)}
    </div>

    <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100"><strong>Controlled filing:</strong> CAATH prepares, validates and records filing readiness. Direct GST portal fetch, filing and challan payment will be enabled only through an authorised GSTN/GSP integration with explicit user consent. Portal passwords, OTPs and CAPTCHAs are not stored here.</div>

    <section className="premium-surface p-5" aria-labelledby="gsp-readiness-title">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div><div className="flex items-center gap-2 text-gold"><PlugZap className="h-5 w-5"/><p className="text-xs font-bold uppercase tracking-[0.18em]">GSTN integration readiness</p></div><h3 id="gsp-readiness-title" className="mt-2 text-xl font-black text-white">GSP sandbox control</h3><p className="mt-1 max-w-2xl text-sm text-slate-400">Consent and provider connections are isolated per client GSTIN. Production filing remains protected by a separate server-side kill switch.</p></div>
        <div className={`rounded-lg border px-4 py-3 text-sm ${gspPlatform?.configured ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/25 bg-amber-300/10 text-amber-100'}`}><p className="font-black">{gspPlatform?.configured ? `${gspPlatform.provider} sandbox configured` : 'GSP contract and credentials pending'}</p><p className="mt-1 text-xs opacity-75">Adapter {gspPlatform?.adapterVersion || 'caath-gsp-contract-v1'} · Production {gspPlatform?.productionEnabled ? 'enabled' : 'locked'}</p></div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <select value={gspProvider} onChange={(e) => setGspProvider(e.target.value)} className={fieldClass} aria-label="Proposed GSP"><option value="IRIS">IRIS Business Services</option><option value="CYGNET">Cygnet</option><option value="CLEARTAX">ClearTax / Defmacro</option><option value="MASTERS_INDIA">Masters India</option><option value="TAXPRO">Chartered Information Systems / TaxPro</option><option value="OTHER">Other GSTN-empanelled GSP</option></select>
          <p className="text-xs text-slate-500">Client selected above: {client?.name || 'Choose a GST client'} {client?.gstin ? `· ${client.gstin}` : ''}</p>
          <label className="flex items-start gap-3 text-xs leading-5 text-slate-300"><input type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-gold"/><span>I confirm that the client has authorised read-only sandbox preparation for returns, notices and challans. This does not authorise filing or payment.</span></label>
          <button type="button" onClick={() => void grantConsent()} disabled={busy || !client || !consentConfirmed || user.role !== 'SuperAdmin'} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold font-black text-black disabled:opacity-40"><ShieldCheck className="h-4 w-4"/>Record sandbox consent</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Client / GSTIN</th><th>Provider</th><th>Environment</th><th>Consent</th><th>Connection</th><th>Action</th></tr></thead><tbody>{gspConnections.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="py-4 font-bold text-white">{item.client?.name || 'Client'}<p className="text-xs font-normal text-slate-500">{item.gstin}</p></td><td>{item.provider_code}</td><td className="capitalize">{item.environment}</td><td>{item.consent_status}</td><td>{item.status}</td><td>{item.consent_status === 'Active' ? <button type="button" onClick={() => void revokeConsent(item.id)} disabled={busy || user.role !== 'SuperAdmin'} className="min-h-11 rounded-lg border border-red-400/30 px-3 text-xs font-bold text-red-300 disabled:opacity-40">Revoke</button> : <span className="text-xs text-slate-600">No action</span>}</td></tr>)}</tbody></table>{!gspConnections.length && <div className="py-10 text-center text-sm text-slate-500">No client GSTIN has granted sandbox consent yet.</div>}</div>
      </div>
    </section>

    <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="GST lifecycle views">{([['filings','Return workpapers',FileCheck2],['challans','Challan register',Landmark],['litigation','Litigation',Scale]] as const).map(([id,label,Icon]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-bold ${view === id ? 'border-gold bg-gold text-black' : 'border-slate-700 text-slate-300'}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>
    {message && <div className="rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light" role="status">{message}</div>}

    <div className="grid gap-5 2xl:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="premium-surface space-y-4 p-5">
        <h3 className="font-black text-white">Add {view === 'filings' ? 'return workpaper' : view === 'challans' ? 'challan' : 'litigation case'}</h3>
        <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={fieldClass}><option value="">Choose GST client</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.gstin}</option>)}</select>
        {view !== 'litigation' && <input required value={period} onChange={(e) => setPeriod(e.target.value)} minLength={3} maxLength={30} placeholder="Tax period, e.g. Apr 2026" className={fieldClass}/>} 
        {view === 'filings' && <><select name="returnType" className={fieldClass}><option>GSTR-1</option><option>GSTR-3B</option><option>GSTR-9</option><option>CMP-08</option></select><select name="frequency" className={fieldClass}><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>Composition</option></select></>}
        {view === 'challans' && <><input required name="purpose" minLength={3} maxLength={120} placeholder="Purpose / tax liability" className={fieldClass}/><input required name="amount" type="number" min="0" step="0.01" placeholder="Amount (₹)" className={fieldClass}/></>}
        {view === 'litigation' && <><input required name="caseNumber" minLength={3} maxLength={80} placeholder="Case / notice number" className={fieldClass}/><select name="forum" className={fieldClass}><option>GST Authority</option><option>Appellate Authority</option><option>Tribunal</option><option>High Court</option><option>Supreme Court</option></select><select name="stage" className={fieldClass}><option>Notice received</option><option>Reply preparation</option><option>Reply filed</option><option>Hearing</option><option>Order received</option><option>Appeal</option><option>Closed</option></select><input name="ownerName" maxLength={100} placeholder="Matter owner" className={fieldClass}/><input required name="amount" type="number" min="0" step="0.01" placeholder="Amount disputed (₹)" className={fieldClass}/></>}
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{view === 'litigation' ? 'Response due date' : 'Due date'}<input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className={`${fieldClass} mt-2`}/></label>
        <button disabled={busy || !client} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold font-black text-black disabled:opacity-40"><Plus className="h-4 w-4"/>Save record</button>
      </form>

      <div className="premium-surface overflow-x-auto p-5">
        <table className="w-full min-w-[820px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Client</th><th>Reference</th><th>Period / deadline</th><th>Amount / validation</th><th>Status</th><th>Next step</th></tr></thead><tbody>
          {view === 'filings' && filings.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="py-4 font-bold text-white">{item.client?.name || item.gstin}<p className="text-xs font-normal text-slate-500">{item.gstin}</p></td><td>{item.return_type}<p className="text-xs text-slate-500">{item.filing_frequency} · {item.source_mode}</p></td><td>{item.tax_period}<p className="text-xs text-slate-500">Due {item.due_date || 'not set'}</p></td><td>{item.validation_errors} validation errors</td><td><span className={`inline-flex border px-2 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span></td><td><select aria-label={`Update ${item.return_type} status`} value={item.status} onChange={(e) => void changeStatus('gst_filing_workpapers', item.id, e.target.value as FilingStatus)} className={fieldClass}><option>Draft</option><option>Validated</option><option>Ready to File</option><option>Filed</option></select></td></tr>)}
          {view === 'challans' && challans.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="py-4 font-bold text-white">{item.client?.name || item.gstin}<p className="text-xs font-normal text-slate-500">{item.gstin}</p></td><td>{item.purpose}<p className="text-xs text-slate-500">{item.challan_number || 'No portal challan number'}</p></td><td>{item.tax_period}<p className="text-xs text-slate-500">Due {item.due_date || 'not set'}</p></td><td>₹{Number(item.amount).toLocaleString('en-IN')}</td><td><span className={`inline-flex border px-2 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span></td><td><select aria-label="Update challan status" value={item.status} onChange={(e) => void changeStatus('gst_challan_register', item.id, e.target.value as ChallanStatus)} className={fieldClass}><option>Draft</option><option>Generated</option><option>Paid</option><option>Expired</option></select></td></tr>)}
          {view === 'litigation' && litigation.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="py-4 font-bold text-white">{item.client?.name || item.gstin}<p className="text-xs font-normal text-slate-500">{item.gstin}</p></td><td>{item.case_number}<p className="text-xs text-slate-500">{item.forum} · {item.stage}</p></td><td>{item.response_due_date || 'No response deadline'}<p className="text-xs text-slate-500">Owner: {item.owner_name || 'Unassigned'}</p></td><td>₹{Number(item.amount_disputed).toLocaleString('en-IN')}</td><td><span className={`inline-flex border px-2 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span></td><td><select aria-label="Update litigation status" value={item.status} onChange={(e) => void changeStatus('gst_litigation_cases', item.id, e.target.value as LitigationStatus)} className={fieldClass}><option>Open</option><option>On hold</option><option>Closed</option></select></td></tr>)}
        </tbody></table>
        {((view === 'filings' && !filings.length) || (view === 'challans' && !challans.length) || (view === 'litigation' && !litigation.length)) && <div className="py-14 text-center"><CalendarClock className="mx-auto h-8 w-8 text-slate-700"/><p className="mt-3 text-slate-500">No records in this lifecycle yet.</p><p className="mt-1 text-xs text-slate-600">Add the first controlled record from the form.</p></div>}
      </div>
    </div>
  </div>;
};

export default GSTComplianceLifecycle;
