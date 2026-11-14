import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, Download, ExternalLink, FileDown, FileSpreadsheet,
  History, LockKeyhole, RefreshCw, Search, ShieldCheck, Upload, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  downloadReconciliationCsv,
  downloadReturnStatusCsv,
  downloadSalesRegisterTemplate,
  GSTClientAuthorization,
  GSTReturnStatus,
  GST_RETURN_TYPES,
  GSTReturnStatusValue,
  GSTReturnType,
  loadGSTPracticeHub,
  LocalFileSummary,
  LocalReconciliation,
  parseLocalGSTInvoiceFile,
  reconcileLocalGSTInvoices,
  recordGSTClientAuthorization,
  recordGSTPortalLaunch,
  revokeGSTClientAuthorization,
  saveGSTReturnStatus,
} from '../services/gstPracticeHubService';
import { GSTClientOption } from '../services/gstComplianceLifecycleService';

type GSTPracticeHubProps = { onNavigate?: (tab: string) => void };
type HubView = 'dashboard' | 'returns' | 'reconciliation' | 'downloads' | 'access';

const FY_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const fieldClass = 'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-gold';
const statusTone: Record<GSTReturnStatusValue, string> = {
  Filed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  Pending: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  'Not Applicable': 'border-slate-600 bg-slate-800 text-slate-300',
  Unknown: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
};

const financialYears = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, index) => `${start - index}-${String(start - index + 1).slice(-2)}`);
};

const formatMoney = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const GSTPracticeHub: React.FC<GSTPracticeHubProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [view, setView] = useState<HubView>('dashboard');
  const [clients, setClients] = useState<GSTClientOption[]>([]);
  const [statuses, setStatuses] = useState<GSTReturnStatus[]>([]);
  const [authorizations, setAuthorizations] = useState<GSTClientAuthorization[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [financialYear, setFinancialYear] = useState(financialYears()[0]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [authorizationExpiry, setAuthorizationExpiry] = useState('');
  const [books, setBooks] = useState<LocalFileSummary | null>(null);
  const [portal, setPortal] = useState<LocalFileSummary | null>(null);
  const [reconciliation, setReconciliation] = useState<LocalReconciliation | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user?.firmId) return;
    setBusy(true); setMessage('');
    try {
      const result = await loadGSTPracticeHub(user.firmId);
      setClients(result.clients); setStatuses(result.statuses); setAuthorizations(result.authorizations);
      if (result.clients[0]) setSelectedClientId((current) => current || result.clients[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load the GST Practice Hub.');
    } finally { setBusy(false); }
  }, [user?.firmId]);

  useEffect(() => { void load(); }, [load]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) || null;
  const activeAuthorization = authorizations.find((item) => item.client_id === selectedClientId && item.status === 'Active') || null;
  const selectedStatuses = useMemo(() => statuses.filter((item) => item.client_id === selectedClientId && item.financial_year === financialYear), [financialYear, selectedClientId, statuses]);
  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => [client.name, client.gstin, client.type].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [clients, search]);

  const totals = useMemo(() => ({
    gstClients: clients.length,
    authorized: new Set(authorizations.filter((item) => item.status === 'Active').map((item) => item.client_id)).size,
    filed: statuses.filter((item) => item.status === 'Filed' && item.financial_year === financialYear).length,
    pending: statuses.filter((item) => item.status === 'Pending' && item.financial_year === financialYear).length,
  }), [authorizations, clients.length, financialYear, statuses]);

  const statusFor = (returnType: GSTReturnType, month: string) => selectedStatuses.find((item) => item.return_type === returnType && item.tax_period === month);

  const updateStatus = async (returnType: GSTReturnType, month: string, status: GSTReturnStatusValue) => {
    if (!user || !selectedClient) return;
    setBusy(true); setMessage('');
    try {
      await saveGSTReturnStatus(user, { client: selectedClient, financialYear, returnType, taxPeriod: month, status });
      setMessage(`${returnType} status for ${month} saved.`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save the filing status.'); }
    finally { setBusy(false); }
  };

  const recordAuthorization = async () => {
    if (!user || !selectedClient || !authorizationConfirmed) return;
    setBusy(true); setMessage('');
    try {
      await recordGSTClientAuthorization(user, { client: selectedClient, expiresOn: authorizationExpiry });
      setAuthorizationConfirmed(false); setAuthorizationExpiry(''); setMessage('Client GST authorization recorded.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record authorization.'); }
    finally { setBusy(false); }
  };

  const revokeAuthorization = async () => {
    if (!user || !activeAuthorization) return;
    setBusy(true); setMessage('');
    try { await revokeGSTClientAuthorization(user, activeAuthorization.id); setMessage('Client authorization revoked.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to revoke authorization.'); }
    finally { setBusy(false); }
  };

  const loadLocalFile = async (kind: 'books' | 'portal', file?: File | null) => {
    if (!file) return;
    setBusy(true); setMessage(''); setReconciliation(null);
    try {
      const summary = await parseLocalGSTInvoiceFile(file);
      if (kind === 'books') setBooks(summary); else setPortal(summary);
      setMessage(`${file.name} processed locally. No raw invoice file was uploaded.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to process the file.'); }
    finally { setBusy(false); }
  };

  const runReconciliation = () => {
    if (!books || !portal) return;
    setReconciliation(reconcileLocalGSTInvoices(books, portal));
    setMessage('Local invoice reconciliation completed.');
  };

  const openPortal = () => {
    if (!user || !selectedClient || !activeAuthorization) return;
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
    void recordGSTPortalLaunch(user, selectedClient);
  };

  if (!user?.firmId) return <div className="p-8 text-slate-400">A firm workspace is required.</div>;

  const tabs: Array<[HubView, string, React.FC<{ className?: string }>]> = [
    ['dashboard', 'Dashboard', BarChart3], ['returns', 'Return Status', CheckCircle2], ['reconciliation', 'Sales Reconciliation', FileSpreadsheet],
    ['downloads', 'Downloads', FileDown], ['access', 'Access & Consent', LockKeyhole],
  ];
  const metrics: Array<[number, string, LucideIcon]> = [
    [totals.gstClients, 'GST clients', Users],
    [totals.authorized, 'Authorised clients', ShieldCheck],
    [totals.filed, 'Filed records', CheckCircle2],
    [totals.pending, 'Pending records', AlertTriangle],
  ];

  return <div className="h-full overflow-y-auto bg-matte-black p-4 text-slate-200 sm:p-6">
    <header className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-gold">CAATH GST Practice Hub</p><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">One desk for every GST client</h2><p className="mt-2 max-w-3xl text-sm text-slate-400">Client authorization, return-status control, local sales reconciliation, bulk period exports and secure official-portal handoff.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onNavigate?.('gst')} className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold hover:border-gold">Advanced analysis</button><button type="button" onClick={() => onNavigate?.('gst-lifecycle')} className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold hover:border-gold">Returns & litigation</button><button type="button" onClick={() => void load()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-black text-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`}/>Refresh</button></div>
      </div>

      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-100"><strong>Privacy design:</strong> uploaded sales registers and portal files are parsed in this browser. Raw invoice files are not sent to CAATH servers. Client master data, authorization evidence and filing-status history remain tenant-isolated in CAATH.</div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([value,label,Icon]) => <div key={label} className="premium-surface p-4"><Icon className="h-5 w-5 text-gold"/><p className="mt-3 text-3xl font-black text-white">{value}</p><p className="text-sm text-slate-500">{label} · {financialYear}</p></div>)}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-600"/><select aria-label="Select GST client" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className={`${fieldClass} pl-10`}><option value="">Select GST client</option>{filteredClients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.gstin}</option>)}</select></label>
        <select aria-label="Financial year" value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} className={fieldClass}>{financialYears().map((year) => <option key={year}>{year}</option>)}</select>
      </div>
      <input aria-label="Search GST clients" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter client name, GSTIN or entity type" className={fieldClass}/>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="GST Practice Hub views">{tabs.map(([id,label,Icon]) => <button key={id} type="button" onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-bold ${view === id ? 'border-gold bg-gold text-black' : 'border-slate-700 text-slate-300 hover:border-gold/60'}`}><Icon className="h-4 w-4"/>{label}</button>)}</nav>
      {message && <div role="status" className="rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">{message}</div>}
    </header>

    <main className="mx-auto mt-5 max-w-[1500px]">
      {view === 'dashboard' && <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="premium-surface p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected client</p><h3 className="mt-2 text-xl font-black text-white">{selectedClient?.name || 'Choose a GST client'}</h3><p className="mt-1 text-sm text-slate-400">{selectedClient?.gstin || 'GSTIN not selected'} · {selectedClient?.type || 'Entity type'}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${activeAuthorization ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'}`}>{activeAuthorization ? 'Authorised' : 'Consent required'}</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><p className="text-xs text-slate-500">Filed</p><p className="mt-2 text-2xl font-black text-emerald-300">{selectedStatuses.filter((item) => item.status === 'Filed').length}</p></div><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><p className="text-xs text-slate-500">Pending</p><p className="mt-2 text-2xl font-black text-amber-200">{selectedStatuses.filter((item) => item.status === 'Pending').length}</p></div><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><p className="text-xs text-slate-500">Last refresh</p><p className="mt-2 text-sm font-bold text-white">{selectedStatuses[0]?.refreshed_at ? new Date(selectedStatuses[0].refreshed_at).toLocaleString() : 'Not synced'}</p></div></div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setView('returns')} className="min-h-11 rounded-lg bg-gold px-4 text-sm font-black text-black">Review return status</button><button type="button" onClick={openPortal} disabled={!selectedClient || !activeAuthorization} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold disabled:opacity-40">Open official GST portal <ExternalLink className="h-4 w-4"/></button></div>
        </section>
        <section className="premium-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fast workflow</p><ol className="mt-4 space-y-3 text-sm text-slate-300">{['Record client authorization once','Choose client and financial year','Open GST portal or import downloaded data','Review filing status and reconcile locally','Export the exception report for follow-up'].map((step,index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 font-black text-gold">{index+1}</span><span className="pt-1">{step}</span></li>)}</ol></section>
      </div>}

      {view === 'returns' && <section className="premium-surface overflow-hidden"><div className="border-b border-slate-800 p-5"><h3 className="text-lg font-black text-white">All-return filing status</h3><p className="mt-1 text-sm text-slate-400">Manual status works now. GSP/API refresh will replace manual updates when provider access is activated.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wider text-slate-500"><tr><th className="sticky left-0 bg-[#17191e] px-4 py-3">Period</th>{GST_RETURN_TYPES.map((type) => <th key={type} className="px-3 py-3">{type}</th>)}</tr></thead><tbody>{FY_MONTHS.map((month) => <tr key={month} className="border-t border-white/5"><td className="sticky left-0 bg-matte-black-light px-4 py-3 font-bold text-white">{month}</td>{GST_RETURN_TYPES.map((returnType) => { const row=statusFor(returnType,month); const value=row?.status || 'Unknown'; return <td key={returnType} className="px-3 py-3"><select aria-label={`${returnType} ${month} filing status`} disabled={!selectedClient || busy} value={value} onChange={(event) => void updateStatus(returnType, month, event.target.value as GSTReturnStatusValue)} className={`min-h-10 rounded-md border px-2 text-xs font-bold outline-none ${statusTone[value]}`}><option>Unknown</option><option>Pending</option><option>Filed</option><option>Not Applicable</option></select></td>;})}</tr>)}</tbody></table></div></section>}

      {view === 'reconciliation' && <div className="space-y-5"><section className="grid gap-4 lg:grid-cols-2">{([['books','Sales register / Tally export',books],['portal','GSTR-1 invoice-wise file',portal]] as const).map(([kind,label,summary]) => <label key={kind} className="premium-surface cursor-pointer p-5 hover:border-gold/40"><Upload className="h-6 w-6 text-gold"/><h3 className="mt-3 font-black text-white">{label}</h3><p className="mt-1 text-sm text-slate-500">CSV or XLSX · processed locally</p><input type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => void loadLocalFile(kind,event.target.files?.[0])}/>{summary && <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-500">Invoices</p><p className="mt-1 font-black text-white">{summary.rows.length}</p></div><div><p className="text-slate-500">Taxable</p><p className="mt-1 font-black text-white">{formatMoney(summary.totalTaxable)}</p></div><div><p className="text-slate-500">Tax</p><p className="mt-1 font-black text-white">{formatMoney(summary.totalTax)}</p></div></div>}</label>)}</section><div className="flex flex-wrap gap-2"><button type="button" onClick={runReconciliation} disabled={!books || !portal || busy} className="min-h-11 rounded-lg bg-gold px-5 text-sm font-black text-black disabled:opacity-40">Run GSTR-1 reconciliation</button><button type="button" onClick={downloadSalesRegisterTemplate} className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold">Download sample CSV</button></div>{reconciliation && <section className="premium-surface p-5"><h3 className="font-black text-white">Reconciliation result</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[reconciliation.matched,'Matched'],[reconciliation.missingInPortal.length,'Missing in portal'],[reconciliation.missingInBooks.length,'Missing in books'],[reconciliation.valueMismatches.length,'Value mismatch']].map(([value,label]) => <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><p className="text-2xl font-black text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div><button type="button" onClick={() => downloadReconciliationCsv(reconciliation,`CAATH-GST-reconciliation-${selectedClient?.gstin || 'client'}-${financialYear}.csv`)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold"><Download className="h-4 w-4"/>Download exception report</button></section>}</div>}

      {view === 'downloads' && <section className="premium-surface p-5"><h3 className="text-lg font-black text-white">Bulk period export centre</h3><p className="mt-1 text-sm text-slate-400">Export CAATH’s filing-status register now. Official return PDFs, JSON and invoice-wise Excel will become available here after the authorised GSP connection is live.</p><div className="mt-5 flex flex-wrap gap-2">{FY_MONTHS.map((month) => <label key={month} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${selectedPeriods.includes(month) ? 'border-gold bg-gold/10 text-gold-light' : 'border-slate-700 text-slate-400'}`}><input type="checkbox" className="mr-2 accent-gold" checked={selectedPeriods.includes(month)} onChange={() => setSelectedPeriods((current) => current.includes(month) ? current.filter((item) => item !== month) : [...current,month])}/>{month}</label>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => downloadReturnStatusCsv(selectedStatuses.filter((row) => selectedPeriods.length === 0 || selectedPeriods.includes(row.tax_period)),`CAATH-GST-return-status-${selectedClient?.gstin || 'client'}-${financialYear}.csv`)} disabled={!selectedClient} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-black text-black disabled:opacity-40"><FileDown className="h-4 w-4"/>Download status Excel-compatible CSV</button><button type="button" disabled className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-500">Return PDFs · GSP pending</button><button type="button" disabled className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-500">JSON bundle · GSP pending</button><button type="button" disabled className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-500">Invoice-wise Excel · GSP pending</button></div></section>}

      {view === 'access' && <div className="grid gap-5 xl:grid-cols-[420px_1fr]"><section className="premium-surface space-y-4 p-5"><ShieldCheck className="h-6 w-6 text-gold"/><div><h3 className="font-black text-white">Client authorization</h3><p className="mt-1 text-sm text-slate-400">Required before opening, downloading or reconciling GST data for this client.</p></div><p className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">{selectedClient?.name || 'Choose a client'}<span className="mt-1 block text-xs text-slate-500">{selectedClient?.gstin || 'GSTIN unavailable'}</span></p><label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Authorization expiry (optional)<input type="date" value={authorizationExpiry} onChange={(event) => setAuthorizationExpiry(event.target.value)} className={`${fieldClass} mt-2`}/></label><label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input type="checkbox" checked={authorizationConfirmed} onChange={(event) => setAuthorizationConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-gold"/><span>I confirm that this client has authorised our firm to access the GST portal, download return data and prepare reconciliation work.</span></label>{activeAuthorization ? <button type="button" onClick={() => void revokeAuthorization()} disabled={busy} className="min-h-11 w-full rounded-lg border border-red-400/30 text-sm font-black text-red-300">Revoke authorization</button> : <button type="button" onClick={() => void recordAuthorization()} disabled={!selectedClient || !authorizationConfirmed || busy} className="min-h-11 w-full rounded-lg bg-gold text-sm font-black text-black disabled:opacity-40">Record authorization</button>}</section><section className="premium-surface overflow-hidden"><div className="border-b border-slate-800 p-5"><h3 className="font-black text-white">Authorization register</h3><p className="mt-1 text-sm text-slate-500">An auditable record for every GST client.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Client</th><th>GSTIN</th><th>Status</th><th>Confirmed</th><th>Expiry</th></tr></thead><tbody>{authorizations.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="px-5 py-4 font-bold text-white">{item.client?.name || 'Client'}</td><td>{item.gstin}</td><td>{item.status}</td><td>{new Date(item.confirmed_at).toLocaleDateString()}</td><td>{item.expires_on || 'Open-ended'}</td></tr>)}</tbody></table>{!authorizations.length && <div className="p-10 text-center text-sm text-slate-500"><History className="mx-auto mb-3 h-7 w-7"/>No client authorization has been recorded yet.</div>}</div></section></div>}
    </main>
  </div>;
};

export default GSTPracticeHub;
