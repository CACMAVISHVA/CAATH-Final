import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, Building2, CalendarDays, FileBarChart, Landmark, LockKeyhole, Plus, ReceiptIndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AccountingAddonWorkspace,
  AccountingBookSummary,
  AccountingClientOption,
  AccountingFinancialYear,
  getAccountingBookSummary,
  initializeAccountingBooks,
  listAccountingAddon,
  listAccountingFinancialYears,
  requestAccountingAddon,
} from '../services/accountingAddonService';

const statusClass: Record<AccountingAddonWorkspace['status'], string> = {
  Active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Pending: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  Suspended: 'border-red-400/30 bg-red-400/10 text-red-300',
  Declined: 'border-slate-600 bg-slate-800 text-slate-300',
};

const currentIndianFinancialYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    label: `${startYear}-${String(startYear + 1).slice(-2)}`,
    startsOn: `${startYear}-04-01`,
    endsOn: `${startYear + 1}-03-31`,
  };
};

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
};

export const AccountingAddon: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<AccountingClientOption[]>([]);
  const [workspaces, setWorkspaces] = useState<AccountingAddonWorkspace[]>([]);
  const [financialYears, setFinancialYears] = useState<AccountingFinancialYear[]>([]);
  const [clientId, setClientId] = useState('');
  const [plan, setPlan] = useState<AccountingAddonWorkspace['plan']>('Client Books');
  const [bookClientId, setBookClientId] = useState('');
  const [financialYearId, setFinancialYearId] = useState('');
  const [summary, setSummary] = useState<AccountingBookSummary | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.firmId) return;
    try {
      const [addon, years] = await Promise.all([
        listAccountingAddon(user.firmId),
        listAccountingFinancialYears(user.firmId),
      ]);
      setClients(addon.clients);
      setWorkspaces(addon.workspaces);
      setFinancialYears(years);
      const firstActive = addon.workspaces.find((item) => item.status === 'Active');
      setBookClientId((current) => current || firstActive?.client_id || '');
    } catch (error) {
      setMessage(errorMessage(error, 'Unable to load accounting.'));
    }
  }, [user?.firmId]);

  useEffect(() => { void load(); }, [load]);

  const requested = useMemo(() => new Set(workspaces.map((item) => item.client_id)), [workspaces]);
  const availableClients = clients.filter((client) => !requested.has(client.id));
  const activeWorkspaces = workspaces.filter((item) => item.status === 'Active');
  const clientYears = financialYears.filter((year) => year.client_id === bookClientId);
  const selectedClient = clients.find((client) => client.id === bookClientId);

  useEffect(() => {
    const preferred = clientYears.find((year) => year.status === 'Open') || clientYears[0];
    setFinancialYearId(preferred?.id || '');
    setSummary(null);
  }, [bookClientId, financialYears.length]);

  if (!user?.firmId) return <div className="p-8 text-slate-400">A firm workspace is required.</div>;

  const submit = async () => {
    setBusy(true); setMessage('');
    try {
      await requestAccountingAddon(clientId, plan, user);
      setClientId('');
      await load();
      setMessage('Accounting request submitted for CAATH approval.');
    } catch (error) {
      setMessage(errorMessage(error, 'Unable to request accounting.'));
    } finally { setBusy(false); }
  };

  const createBooks = async () => {
    if (!bookClientId) return;
    const year = currentIndianFinancialYear();
    setBusy(true); setMessage('');
    try {
      const id = await initializeAccountingBooks({ clientId: bookClientId, label: year.label, startsOn: year.startsOn, endsOn: year.endsOn });
      await load();
      setFinancialYearId(id);
      setMessage(`Books for FY ${year.label} are ready.`);
    } catch (error) {
      setMessage(errorMessage(error, 'Unable to initialize accounting books.'));
    } finally { setBusy(false); }
  };

  const openBooks = async () => {
    if (!financialYearId) return;
    setBusy(true); setMessage('');
    try {
      setSummary(await getAccountingBookSummary(financialYearId));
    } catch (error) {
      setMessage(errorMessage(error, 'Unable to open these books.'));
    } finally { setBusy(false); }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Separate books for every client</p>
      <h2 className="mt-2 text-3xl font-black text-white">Accounting</h2>
      <p className="mt-2 max-w-3xl text-slate-400">Choose an existing client and financial year. CAATH keeps every client’s books isolated inside your firm workspace.</p>
    </div>

    {message && <div role="status" className="border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">{message}</div>}

    <section className="premium-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-slate-400">Client
          <select value={bookClientId} onChange={(event) => setBookClientId(event.target.value)} className="mt-2 w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold">
            <option value="">Choose an active accounting client</option>
            {activeWorkspaces.map((workspace) => <option key={workspace.client_id} value={workspace.client_id}>{workspace.client?.name || 'Client'}</option>)}
          </select>
        </label>
        <label className="flex-1 text-xs font-bold uppercase tracking-wider text-slate-400">Financial year
          <select value={financialYearId} onChange={(event) => { setFinancialYearId(event.target.value); setSummary(null); }} className="mt-2 w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold">
            <option value="">{bookClientId ? 'Choose financial year' : 'Choose a client first'}</option>
            {clientYears.map((year) => <option key={year.id} value={year.id}>{year.label} · {year.status}</option>)}
          </select>
        </label>
        {bookClientId && !clientYears.length ? (
          <button type="button" onClick={createBooks} disabled={busy || !['SuperAdmin', 'Admin'].includes(user.role)} className="min-h-11 bg-gold px-5 py-3 text-sm font-black text-black disabled:opacity-40">
            <CalendarDays className="mr-2 inline h-4 w-4"/>Create current FY
          </button>
        ) : (
          <button type="button" onClick={openBooks} disabled={busy || !financialYearId} className="min-h-11 bg-gold px-5 py-3 text-sm font-black text-black disabled:opacity-40">
            Open books <ArrowRight className="ml-2 inline h-4 w-4"/>
          </button>
        )}
      </div>
      {!activeWorkspaces.length && <p className="mt-4 text-sm text-slate-500">Activate accounting for a client below before opening books.</p>}
    </section>

    {summary && (
      <section className="grid gap-4 sm:grid-cols-3" aria-label={`Accounting summary for ${selectedClient?.name || 'client'}`}>
        {[['Ledgers', summary.accounts], ['Draft vouchers', summary.draftVouchers], ['Posted vouchers', summary.postedVouchers]].map(([label, value]) => <div key={String(label)} className="premium-surface p-5"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>)}
      </section>
    )}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[['Ledgers & vouchers', BookOpenCheck, 'Double-entry books with controlled posting.'], ['GST-ready sales', ReceiptIndianRupee, 'A clean foundation for invoices and tax ledgers.'], ['Bank reconciliation', Landmark, 'Designed for statement matching and review.'], ['Financial reports', FileBarChart, 'Trial balance, profit and loss, and balance sheet foundation.']].map(([title, Icon, copy]) => <div key={String(title)} className="premium-surface p-5"><Icon className="h-5 w-5 text-gold"/><h3 className="mt-3 font-black text-white">{String(title)}</h3><p className="mt-2 text-sm text-slate-400">{String(copy)}</p></div>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="premium-surface space-y-4 p-5">
        <div><h3 className="text-lg font-black text-white">Add accounting for a client</h3><p className="mt-1 text-sm text-slate-500">The client record is reused; no duplicate master is created.</p></div>
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold"><option value="">Choose a client</option>{availableClients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.type}</option>)}</select>
        <select value={plan} onChange={(event) => setPlan(event.target.value as AccountingAddonWorkspace['plan'])} className="w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold"><option>Client Books</option><option>Client Books Pro</option></select>
        <button onClick={submit} disabled={busy || !clientId || user.role !== 'SuperAdmin'} className="flex min-h-11 w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-black text-black disabled:opacity-40"><Plus className="h-4 w-4"/>Request accounting</button>
        {user.role !== 'SuperAdmin' && <p className="flex gap-2 text-xs text-slate-500"><LockKeyhole className="h-4 w-4 shrink-0"/>Only the Super Admin can request a paid client workspace.</p>}
      </div>
      <div className="premium-surface overflow-x-auto p-5"><h3 className="mb-4 text-lg font-black text-white">Client accounting access</h3><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Client</th><th>Entity</th><th>Plan</th><th>Status</th><th>Commercial</th></tr></thead><tbody>{workspaces.map((workspace) => <tr key={workspace.id} className="border-t border-white/5"><td className="py-4"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-gold"/><div><p className="font-bold text-white">{workspace.client?.name || 'Client'}</p><p className="text-xs text-slate-500">{workspace.client?.pan || 'PAN unavailable'}</p></div></div></td><td>{workspace.client?.type || '—'}</td><td>{workspace.plan}</td><td><span className={`inline-flex border px-2.5 py-1 text-xs font-bold ${statusClass[workspace.status]}`}>{workspace.status}</span></td><td>{workspace.monthly_price == null ? 'Quote pending' : `₹${Number(workspace.monthly_price).toLocaleString('en-IN')}/month`}</td></tr>)}</tbody></table>{!workspaces.length && <p className="py-10 text-center text-slate-500">No accounting clients yet.</p>}</div>
    </div>
  </div>;
};

export default AccountingAddon;
