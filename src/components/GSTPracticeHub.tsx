import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, Download, ExternalLink, FileDown, FileSpreadsheet, FileText,
  History, ListChecks, LockKeyhole, RefreshCw, Search, Send, ShieldCheck, Upload, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  downloadReconciliationCsv,
  downloadReturnStatusCsv,
  downloadSalesRegisterTemplate,
  GSTClientAuthorization,
  GST_FILING_RETURN_TYPES,
  GSTReturnProfile,
  GSTReturnProfileType,
  GSTReturnStatus,
  GSTReturnStatusValue,
  GSTReturnType,
  gstReturnFrequency,
  loadGSTPracticeHub,
  LocalFileSummary,
  LocalReconciliation,
  parseLocalGSTInvoiceFile,
  reconcileLocalGSTInvoices,
  recordGSTClientAuthorization,
  recordGSTPortalLaunch,
  revokeGSTClientAuthorization,
  saveGSTReturnProfiles,
  saveGSTReturnStatus,
} from '../services/gstPracticeHubService';
import { GSTClientOption } from '../services/gstComplianceLifecycleService';
import { buildGSTControlRows, prepareGSTDataFollowups } from '../services/gstControlCenterService';
import { downloadGSTControlReport } from '../services/gstControlReportService';
import { getGSTDueDate, gstComplianceTotals, gstMatrixDisplayStatus, gstPeriodForFinancialYearMonth, GSTMatrixDisplayStatus } from '../services/gstDueDateEngine';

type GSTPracticeHubProps = { onNavigate?: (tab: string) => void; initialView?: HubView };
type HubView = 'dashboard' | 'control' | 'matrix' | 'returns' | 'setup' | 'reconciliation' | 'downloads' | 'access';
type ControlFilter = 'All' | 'Filed' | 'Pending' | 'Missing data';

const FY_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const fieldClass = 'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-gold';
const statusTone: Record<GSTReturnStatusValue | GSTMatrixDisplayStatus, string> = {
  Filed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  Pending: 'border-red-400/25 bg-red-400/10 text-red-100',
  'Not Applicable': 'border-slate-600 bg-slate-800 text-slate-300',
  Unknown: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  'Not set': 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  Overdue: 'border-amber-400/40 bg-amber-400/15 text-amber-100',
};

const financialYears = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, index) => `${start - index}-${String(start - index + 1).slice(-2)}`);
};

const formatMoney = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const GSTPracticeHub: React.FC<GSTPracticeHubProps> = ({ onNavigate, initialView = 'dashboard' }) => {
  const { user } = useAuth();
  const [view, setView] = useState<HubView>(initialView);
  const [clients, setClients] = useState<GSTClientOption[]>([]);
  const [statuses, setStatuses] = useState<GSTReturnStatus[]>([]);
  const [authorizations, setAuthorizations] = useState<GSTClientAuthorization[]>([]);
  const [profiles, setProfiles] = useState<GSTReturnProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [financialYear, setFinancialYear] = useState(financialYears()[0]);
  const [controlPeriod, setControlPeriod] = useState(FY_MONTHS[new Date().getMonth() < 3 ? new Date().getMonth() + 9 : new Date().getMonth() - 3]);
  const [controlFilter, setControlFilter] = useState<ControlFilter>('All');
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
      setClients(result.clients); setStatuses(result.statuses); setAuthorizations(result.authorizations); setProfiles(result.profiles);
      if (result.clients[0]) setSelectedClientId((current) => current || result.clients[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load the GST Practice Hub.');
    } finally { setBusy(false); }
  }, [user?.firmId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setView(initialView); }, [initialView]);

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
  const returnTypesForClient = (clientId: string): GSTReturnProfileType[] => {
    const configured = profiles.filter((profile) => profile.client_id === clientId).map((profile) => profile.return_type);
    return configured.length ? configured : ['GSTR-1', 'GSTR-3B'];
  };
  const configuredReturnTypes = selectedClient ? returnTypesForClient(selectedClient.id) : [];
  const matrixCell = (clientId: string, returnType: 'GSTR-1' | 'GSTR-3B', month: string) => {
    const client = clients.find((item) => item.id === clientId);
    if (!client?.gstin?.trim()) return { status: 'Not Applicable' as GSTMatrixDisplayStatus, due: null, requiresGstin: true };
    if (!returnTypesForClient(clientId).includes(returnType)) return { status: 'Not Applicable' as GSTMatrixDisplayStatus, due: null, requiresGstin: false };
    const profile = profiles.find((item) => item.client_id === clientId && item.return_type === returnType);
    const scheme = profile?.filing_frequency === 'Quarterly' ? 'QRMP' : 'MONTHLY';
    const due = getGSTDueDate({ returnType, period: gstPeriodForFinancialYearMonth(financialYear, month), scheme });
    const stored = statuses.find((status) => status.client_id === clientId && status.financial_year === financialYear && status.tax_period === month && status.return_type === returnType)?.status;
    return { status: gstMatrixDisplayStatus(stored, due), due, requiresGstin: false };
  };
  const matrixTotalsForClient = (clientId: string) => gstComplianceTotals(FY_MONTHS.flatMap((month) => (['GSTR-1', 'GSTR-3B'] as const).map((returnType) => matrixCell(clientId, returnType, month).status)));
  const controlRows = useMemo(() => buildGSTControlRows(filteredClients, statuses, financialYear, controlPeriod), [controlPeriod, filteredClients, financialYear, statuses]);
  const controlTotals = useMemo(() => ({
    filed: controlRows.filter((row) => row.action === 'Filed').length,
    review: controlRows.filter((row) => row.action === 'Review filing').length,
    request: controlRows.filter((row) => row.action === 'Request data').length,
  }), [controlRows]);
  const visibleControlRows = useMemo(() => controlRows.filter((row) => {
    if (controlFilter === 'All') return true;
    if (controlFilter === 'Filed') return row.action === 'Filed';
    if (controlFilter === 'Pending') return row.action === 'Review filing';
    return row.action === 'Request data';
  }), [controlFilter, controlRows]);

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

  const prepareFollowups = async () => {
    if (!user) return;
    setBusy(true); setMessage('');
    try {
      const result = await prepareGSTDataFollowups(user, visibleControlRows, financialYear, controlPeriod, new Date().toISOString().slice(0, 10));
      setMessage(result.created ? `${result.created} GST data follow-up${result.created === 1 ? '' : 's'} added to the client follow-up queue.${result.skipped ? ` ${result.skipped} already existed.` : ''}` : 'No new data follow-ups were needed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to prepare GST data follow-ups.'); }
    finally { setBusy(false); }
  };

  const downloadControlReport = async () => {
    setBusy(true); setMessage('');
    try {
      await downloadGSTControlReport({ financialYear, taxPeriod: controlPeriod, rows: visibleControlRows, totalClients: controlRows.length });
      setMessage('GST Control Centre Word report generated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate the GST Control Centre report.'); }
    finally { setBusy(false); }
  };

  const toggleReturnProfile = (returnType: GSTReturnProfileType) => {
    if (!selectedClient) return;
    const next = configuredReturnTypes.includes(returnType) ? configuredReturnTypes.filter((item) => item !== returnType) : [...configuredReturnTypes, returnType];
    setProfiles((current) => [...current.filter((profile) => profile.client_id !== selectedClient.id), ...next.map((item) => ({ id: `draft-${item}`, client_id: selectedClient.id, return_type: item, filing_frequency: gstReturnFrequency(item), active_from: null, active_until: null }))]);
  };

  const saveReturnProfile = async () => {
    if (!user || !selectedClient) return;
    setBusy(true); setMessage('');
    try { await saveGSTReturnProfiles(user, selectedClient, configuredReturnTypes); setMessage(`Return profile saved for ${selectedClient.name}.`); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save this return profile.'); }
    finally { setBusy(false); }
  };

  if (!user?.firmId) return <div className="p-8 text-slate-400">A firm workspace is required.</div>;

  const tabs: Array<[HubView, string, React.FC<{ className?: string }>]> = [
    ['dashboard', 'Dashboard', BarChart3], ['control', 'Control Centre', ListChecks], ['matrix', 'Filing Matrix', FileSpreadsheet], ['returns', 'Client Return Detail', CheckCircle2], ['setup', 'Return Setup', ShieldCheck], ['reconciliation', 'Sales Reconciliation', FileSpreadsheet],
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
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setView('matrix')} className="min-h-11 rounded-lg bg-gold px-4 text-sm font-black text-black">Open filing matrix</button><button type="button" onClick={() => setView('returns')} className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold">Review return status</button><button type="button" onClick={openPortal} disabled={!selectedClient || !activeAuthorization} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold disabled:opacity-40">Open official GST portal <ExternalLink className="h-4 w-4"/></button></div>
        </section>
        <section className="premium-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fast workflow</p><ol className="mt-4 space-y-3 text-sm text-slate-300">{['Record client authorization once','Choose client and financial year','Open GST portal or import downloaded data','Review filing status and reconcile locally','Export the exception report for follow-up'].map((step,index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 font-black text-gold">{index+1}</span><span className="pt-1">{step}</span></li>)}</ol></section>
      </div>}

      {view === 'control' && <section className="space-y-5">
        <div className="premium-surface p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-gold">Monthly operating view</p><h3 className="mt-2 text-xl font-black text-white">All-client GST Control Centre</h3><p className="mt-1 max-w-3xl text-sm text-slate-400">Every GST client, GSTR-1 and GSTR-3B in one working queue. Follow-ups are created as CAATH client-interaction records; no external email or WhatsApp is sent until a delivery provider is connected.</p></div>
            <div className="flex flex-wrap gap-2"><select aria-label="Control Centre tax period" value={controlPeriod} onChange={(event) => setControlPeriod(event.target.value)} className={fieldClass}>{FY_MONTHS.map((month) => <option key={month}>{month}</option>)}</select><select aria-label="Filter control-centre status" value={controlFilter} onChange={(event) => setControlFilter(event.target.value as ControlFilter)} className={fieldClass}><option>All</option><option>Filed</option><option>Pending</option><option>Missing data</option></select><button type="button" onClick={() => void downloadControlReport()} disabled={busy || visibleControlRows.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold disabled:opacity-40"><FileText className="h-4 w-4"/>Generate report</button><button type="button" onClick={() => void prepareFollowups()} disabled={busy || !visibleControlRows.some((row) => row.action === 'Request data')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-black text-black disabled:opacity-40"><Send className="h-4 w-4"/>Queue data follow-ups</button></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><p className="text-2xl font-black text-emerald-200">{controlTotals.filed}</p><p className="text-xs text-slate-400">Both returns filed</p></div><div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-4"><p className="text-2xl font-black text-amber-100">{controlTotals.review}</p><p className="text-xs text-slate-400">Need filing review</p></div><div className="rounded-lg border border-sky-400/20 bg-sky-400/[0.06] p-4"><p className="text-2xl font-black text-sky-100">{controlTotals.request}</p><p className="text-xs text-slate-400">Need client data</p></div></div>
        </div>
        <div className="premium-surface overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Client</th><th className="px-4 py-3">GSTIN</th><th className="px-4 py-3">GSTR-1</th><th className="px-4 py-3">GSTR-3B</th><th className="px-4 py-3">Next action</th></tr></thead><tbody>{visibleControlRows.map((row) => <tr key={row.client.id} className="border-t border-white/5"><td className="px-5 py-4 font-bold text-white">{row.client.name}</td><td className="px-4 py-4 text-xs text-slate-400">{row.client.gstin}</td><td className="px-4 py-4"><span className={`rounded border px-2 py-1 text-xs font-bold ${statusTone[row.gstr1]}`}>{row.gstr1}</span></td><td className="px-4 py-4"><span className={`rounded border px-2 py-1 text-xs font-bold ${statusTone[row.gstr3b]}`}>{row.gstr3b}</span></td><td className="px-4 py-4"><span className={row.action === 'Filed' ? 'text-emerald-200' : row.action === 'Review filing' ? 'text-amber-100' : 'text-sky-100'}>{row.action === 'Request data' ? `Request data for ${row.outstandingReturns.join(' + ')}` : row.action}</span></td></tr>)}</tbody></table>{!visibleControlRows.length && <div className="p-10 text-center text-sm text-slate-500">No GST clients match this filter.</div>}</div>
      </section>}

      {view === 'matrix' && <section className="space-y-5">
        <div className="premium-surface p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-gold">Firm-wide working register</p><h3 className="mt-2 text-xl font-black text-white">Monthly GST Filing Matrix</h3><p className="mt-1 max-w-3xl text-sm text-slate-400">Every client assigned GST Filing is shown here. Add a GSTIN in Client Master before recording a return status.</p></div><select aria-label="Matrix financial year" value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} className={fieldClass}>{financialYears().map((year) => <option key={year}>{year}</option>)}</select></div><div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/5 p-3 text-sm text-sky-100"><strong>GSTR-2A / GSTR-2B:</strong> these are portal/GSP-generated ITC statements for reconciliation. CAATH will show their sync/reconciliation result; staff must not mark them as “filed.”</div></div>
        <div className="premium-surface overflow-x-auto"><table className="w-full min-w-[2750px] text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wider text-slate-500"><tr><th rowSpan={2} className="sticky left-0 z-20 bg-[#17191e] px-4 py-3">Client</th><th rowSpan={2} className="px-3 py-3 text-center">Filed</th><th rowSpan={2} className="px-3 py-3 text-center">Pending</th><th rowSpan={2} className="px-3 py-3 text-center">Overdue</th><th rowSpan={2} className="px-3 py-3 text-center">Compliance</th>{FY_MONTHS.map((month) => <th key={month} colSpan={2} className="border-l border-slate-800 px-3 py-3 text-center">{month}</th>)}</tr><tr>{FY_MONTHS.flatMap((month) => [<th key={`${month}-1`} className="border-l border-slate-800 px-3 py-2">GSTR-1</th>, <th key={`${month}-3b`} className="px-3 py-2">GSTR-3B</th>])}</tr></thead><tbody>{filteredClients.map((client) => { const totalsForClient = matrixTotalsForClient(client.id); const gstinMissing = !client.gstin?.trim(); return <tr key={client.id} className="border-t border-white/5"><td className="sticky left-0 z-10 bg-matte-black-light px-4 py-3 font-bold text-white">{client.name}<p className={`mt-1 text-[11px] font-normal ${gstinMissing ? 'text-amber-200' : 'text-slate-500'}`}>{gstinMissing ? 'GSTIN needed · update Client Master' : client.gstin}</p></td><td className="px-3 text-center font-bold text-emerald-200">{totalsForClient.filed}</td><td className="px-3 text-center font-bold text-red-200">{totalsForClient.pending}</td><td className="px-3 text-center font-bold text-amber-100">{totalsForClient.overdue}</td><td className="px-3 text-center font-bold text-white">{totalsForClient.compliancePercent === null ? '—' : `${totalsForClient.compliancePercent}%`}</td>{FY_MONTHS.flatMap((month) => (['GSTR-1', 'GSTR-3B'] as const).map((returnType) => { const cell = matrixCell(client.id, returnType, month); return <td key={`${client.id}-${month}-${returnType}`} className="border-l border-white/5 px-2 py-3"><span className={`inline-flex min-w-24 justify-center rounded border px-2 py-1 text-xs font-bold ${statusTone[cell.status]}`}>{cell.requiresGstin ? 'GSTIN needed' : cell.status === 'Not Applicable' ? 'N/A' : cell.status}</span>{cell.due && <p className="mt-1 text-center text-[10px] text-slate-500">Due {new Date(`${cell.due.dueDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{cell.due.extended ? ' · extended' : ''}</p>}</td>; }))}</tr>; })}</tbody></table>{!filteredClients.length && <div className="p-10 text-center text-sm text-slate-500">No GST Filing clients match this filter.</div>}</div>
      </section>}

      {view === 'setup' && <section className="grid gap-5 xl:grid-cols-[360px_1fr]"><div className="premium-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-gold">Client-specific return profile</p><h3 className="mt-2 text-xl font-black text-white">Assign only relevant forms</h3><p className="mt-1 text-sm text-slate-400">Choose a GST client, then assign the filing forms you handle. A client with only CMP-08 will not be shown as pending GSTR-1 or GSTR-3B.</p><select aria-label="Choose client for return setup" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className={`${fieldClass} mt-5`}><option value="">Choose GST client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.gstin}</option>)}</select><div className="mt-5 space-y-3">{GST_FILING_RETURN_TYPES.map((returnType) => <label key={returnType} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 p-3 hover:border-gold/50"><input type="checkbox" checked={configuredReturnTypes.includes(returnType)} onChange={() => toggleReturnProfile(returnType)} disabled={!selectedClient || busy} className="mt-1 h-4 w-4 accent-gold"/><span><strong className="text-white">{returnType}</strong><span className="ml-2 text-xs text-slate-500">{returnType === 'CMP-08' ? 'Quarterly' : returnType === 'GSTR-9' || returnType === 'GSTR-9C' ? 'Annual' : 'Monthly'}</span></span></label>)}</div><button type="button" onClick={() => void saveReturnProfile()} disabled={!selectedClient || busy} className="mt-5 min-h-11 w-full rounded-lg bg-gold px-4 text-sm font-black text-black disabled:opacity-40">Save client return profile</button></div><div className="space-y-5"><div className="premium-surface p-5"><h3 className="font-black text-white">Safeguards built into the workflow</h3><div className="mt-4 space-y-4 text-sm text-slate-300"><p><strong className="text-gold">GSTR-2A / GSTR-2B:</strong> Not filing forms. They are read-only statements; their role is reconciliation and checking the ITC considered in GSTR-3B.</p><p><strong className="text-gold">GSTR-9:</strong> Annual only. It is never put into every month’s matrix; assign it only where the client needs it.</p><p><strong className="text-gold">GSTR-9C:</strong> Annual reconciliation, configured only where applicable, and managed after the annual-return workflow.</p><p><strong className="text-gold">CMP-08:</strong> Quarterly profile. When assigned, the monthly GSTR-1/GSTR-3B cells become N/A.</p></div></div><div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm text-amber-100"><strong>Filing control:</strong> CAATH can prepare, reconcile and track status. Portal filing must remain gated behind an authorised GSP/GSTN connection and a professional review; it must not use stored portal passwords or OTPs.</div></div></section>}

      {view === 'returns' && <section className="premium-surface overflow-hidden"><div className="border-b border-slate-800 p-5"><h3 className="text-lg font-black text-white">Client return detail</h3><p className="mt-1 text-sm text-slate-400">Only filing forms assigned in Return Setup appear here. GSTR-2A/2B are intentionally excluded because they are generated statements, not returns to file.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wider text-slate-500"><tr><th className="sticky left-0 bg-[#17191e] px-4 py-3">Period</th>{configuredReturnTypes.filter((type) => type === 'GSTR-1' || type === 'GSTR-3B').map((type) => <th key={type} className="px-3 py-3">{type}</th>)}</tr></thead><tbody>{FY_MONTHS.map((month) => <tr key={month} className="border-t border-white/5"><td className="sticky left-0 bg-matte-black-light px-4 py-3 font-bold text-white">{month}</td>{configuredReturnTypes.filter((type) => type === 'GSTR-1' || type === 'GSTR-3B').map((returnType) => { const row=statusFor(returnType,month); const value=row?.status || 'Unknown'; return <td key={returnType} className="px-3 py-3"><select aria-label={`${returnType} ${month} filing status`} disabled={!selectedClient || busy} value={value} onChange={(event) => void updateStatus(returnType, month, event.target.value as GSTReturnStatusValue)} className={`min-h-10 rounded-md border px-2 text-xs font-bold outline-none ${statusTone[value]}`}><option>Unknown</option><option>Pending</option><option>Filed</option><option>Not Applicable</option></select></td>;})}</tr>)}</tbody></table></div></section>}

      {view === 'reconciliation' && <div className="space-y-5"><section className="grid gap-4 lg:grid-cols-2">{([['books','Sales register / Tally export',books],['portal','GSTR-1 invoice-wise file',portal]] as const).map(([kind,label,summary]) => <label key={kind} className="premium-surface cursor-pointer p-5 hover:border-gold/40"><Upload className="h-6 w-6 text-gold"/><h3 className="mt-3 font-black text-white">{label}</h3><p className="mt-1 text-sm text-slate-500">CSV or XLSX · processed locally</p><input type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => void loadLocalFile(kind,event.target.files?.[0])}/>{summary && <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-500">Invoices</p><p className="mt-1 font-black text-white">{summary.rows.length}</p></div><div><p className="text-slate-500">Taxable</p><p className="mt-1 font-black text-white">{formatMoney(summary.totalTaxable)}</p></div><div><p className="text-slate-500">Tax</p><p className="mt-1 font-black text-white">{formatMoney(summary.totalTax)}</p></div></div>}</label>)}</section><div className="flex flex-wrap gap-2"><button type="button" onClick={runReconciliation} disabled={!books || !portal || busy} className="min-h-11 rounded-lg bg-gold px-5 text-sm font-black text-black disabled:opacity-40">Run GSTR-1 reconciliation</button><button type="button" onClick={downloadSalesRegisterTemplate} className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold">Download sample CSV</button></div>{reconciliation && <section className="premium-surface p-5"><h3 className="font-black text-white">Reconciliation result</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[reconciliation.matched,'Matched'],[reconciliation.missingInPortal.length,'Missing in portal'],[reconciliation.missingInBooks.length,'Missing in books'],[reconciliation.valueMismatches.length,'Value mismatch']].map(([value,label]) => <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><p className="text-2xl font-black text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div><button type="button" onClick={() => downloadReconciliationCsv(reconciliation,`CAATH-GST-reconciliation-${selectedClient?.gstin || 'client'}-${financialYear}.csv`)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold"><Download className="h-4 w-4"/>Download exception report</button></section>}</div>}

      {view === 'downloads' && <section className="premium-surface p-5"><h3 className="text-lg font-black text-white">Bulk period export centre</h3><p className="mt-1 text-sm text-slate-400">Export CAATH’s filing-status register now. Official return PDFs, JSON and invoice-wise Excel will become available here after the authorised GSP connection is live.</p><div className="mt-5 flex flex-wrap gap-2">{FY_MONTHS.map((month) => <label key={month} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${selectedPeriods.includes(month) ? 'border-gold bg-gold/10 text-gold-light' : 'border-slate-700 text-slate-400'}`}><input type="checkbox" className="mr-2 accent-gold" checked={selectedPeriods.includes(month)} onChange={() => setSelectedPeriods((current) => current.includes(month) ? current.filter((item) => item !== month) : [...current,month])}/>{month}</label>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => downloadReturnStatusCsv(selectedStatuses.filter((row) => selectedPeriods.length === 0 || selectedPeriods.includes(row.tax_period)),`CAATH-GST-return-status-${selectedClient?.gstin || 'client'}-${financialYear}.csv`)} disabled={!selectedClient} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-black text-black disabled:opacity-40"><FileDown className="h-4 w-4"/>Download status Excel-compatible CSV</button><button type="button" disabled className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-500">Return PDFs · GSP pending</button><button type="button" disabled className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-500">JSON bundle · GSP pending</button><button type="button" disabled className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-500">Invoice-wise Excel · GSP pending</button></div></section>}

      {view === 'access' && <div className="grid gap-5 xl:grid-cols-[420px_1fr]"><section className="premium-surface space-y-4 p-5"><ShieldCheck className="h-6 w-6 text-gold"/><div><h3 className="font-black text-white">Client authorization</h3><p className="mt-1 text-sm text-slate-400">Required before opening, downloading or reconciling GST data for this client.</p></div><p className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">{selectedClient?.name || 'Choose a client'}<span className="mt-1 block text-xs text-slate-500">{selectedClient?.gstin || 'GSTIN unavailable'}</span></p><label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Authorization expiry (optional)<input type="date" value={authorizationExpiry} onChange={(event) => setAuthorizationExpiry(event.target.value)} className={`${fieldClass} mt-2`}/></label><label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input type="checkbox" checked={authorizationConfirmed} onChange={(event) => setAuthorizationConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-gold"/><span>I confirm that this client has authorised our firm to access the GST portal, download return data and prepare reconciliation work.</span></label>{activeAuthorization ? <button type="button" onClick={() => void revokeAuthorization()} disabled={busy} className="min-h-11 w-full rounded-lg border border-red-400/30 text-sm font-black text-red-300">Revoke authorization</button> : <button type="button" onClick={() => void recordAuthorization()} disabled={!selectedClient || !authorizationConfirmed || busy} className="min-h-11 w-full rounded-lg bg-gold text-sm font-black text-black disabled:opacity-40">Record authorization</button>}</section><section className="premium-surface overflow-hidden"><div className="border-b border-slate-800 p-5"><h3 className="font-black text-white">Authorization register</h3><p className="mt-1 text-sm text-slate-500">An auditable record for every GST client.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Client</th><th>GSTIN</th><th>Status</th><th>Confirmed</th><th>Expiry</th></tr></thead><tbody>{authorizations.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="px-5 py-4 font-bold text-white">{item.client?.name || 'Client'}</td><td>{item.gstin}</td><td>{item.status}</td><td>{new Date(item.confirmed_at).toLocaleDateString()}</td><td>{item.expires_on || 'Open-ended'}</td></tr>)}</tbody></table>{!authorizations.length && <div className="p-10 text-center text-sm text-slate-500"><History className="mx-auto mb-3 h-7 w-7"/>No client authorization has been recorded yet.</div>}</div></section></div>}
    </main>
  </div>;
};

export default GSTPracticeHub;
