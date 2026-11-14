import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Building2, CheckCircle2, FileBarChart, Landmark, LockKeyhole, Plus, ReceiptIndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AccountingAddonWorkspace, AccountingClientOption, listAccountingAddon, requestAccountingAddon } from '../services/accountingAddonService';

const statusClass: Record<AccountingAddonWorkspace['status'], string> = {
  Active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Pending: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  Suspended: 'border-red-400/30 bg-red-400/10 text-red-300',
  Declined: 'border-slate-600 bg-slate-800 text-slate-300',
};

export const AccountingAddon: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<AccountingClientOption[]>([]);
  const [workspaces, setWorkspaces] = useState<AccountingAddonWorkspace[]>([]);
  const [clientId, setClientId] = useState('');
  const [plan, setPlan] = useState<AccountingAddonWorkspace['plan']>('Client Books');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.firmId) return;
    try {
      const result = await listAccountingAddon(user.firmId);
      setClients(result.clients);
      setWorkspaces(result.workspaces);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load accounting add-ons.');
    }
  }, [user?.firmId]);

  useEffect(() => { void load(); }, [load]);
  const requested = useMemo(() => new Set(workspaces.map((item) => item.client_id)), [workspaces]);
  const availableClients = clients.filter((client) => !requested.has(client.id));
  const activeCount = workspaces.filter((item) => item.status === 'Active').length;

  if (!user?.firmId) return <div className="p-8 text-slate-400">A firm workspace is required.</div>;

  const submit = async () => {
    setBusy(true); setMessage('');
    try {
      await requestAccountingAddon(clientId, plan, user);
      setClientId('');
      await load();
      setMessage('Accounting add-on request submitted. Pricing and activation remain under God Admin approval.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to request the accounting add-on.');
    } finally { setBusy(false); }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Optional paid workspace</p><h2 className="mt-2 text-3xl font-black text-white">Client Accounting</h2><p className="mt-2 max-w-3xl text-slate-400">Maintain separate books for the clients whose accounting your practice manages. Each client workspace is isolated, separately activated and audit-ready.</p></div>
      <div className="rounded-xl border border-gold/25 bg-gold/10 px-5 py-4"><p className="text-xs uppercase tracking-widest text-gold-light">Active client books</p><p className="mt-1 text-3xl font-black text-white">{activeCount}</p></div>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[['Ledgers & vouchers', BookOpenCheck, 'Double-entry books with approval controls.'], ['GST-ready sales', ReceiptIndianRupee, 'Invoices, tax ledgers and reconciliation foundation.'], ['Bank reconciliation', Landmark, 'Statement matching and unresolved-item review.'], ['Financial reports', FileBarChart, 'Trial balance, P&L and balance sheet.']].map(([title, Icon, copy]) => <div key={String(title)} className="premium-surface p-5"><Icon className="h-5 w-5 text-gold"/><h3 className="mt-3 font-black text-white">{String(title)}</h3><p className="mt-2 text-sm text-slate-400">{String(copy)}</p></div>)}
    </div>

    {message && <div className="border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">{message}</div>}

    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="premium-surface space-y-4 p-5">
        <div><h3 className="text-lg font-black text-white">Request client workspace</h3><p className="mt-1 text-sm text-slate-500">No charge or activation happens until CAATH confirms the add-on price.</p></div>
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold"><option value="">Choose a client</option>{availableClients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.type}</option>)}</select>
        <select value={plan} onChange={(event) => setPlan(event.target.value as AccountingAddonWorkspace['plan'])} className="w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold"><option>Client Books</option><option>Client Books Pro</option></select>
        <button onClick={submit} disabled={busy || !clientId || user.role !== 'SuperAdmin'} className="flex w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-black text-black disabled:opacity-40"><Plus className="h-4 w-4"/>Request add-on</button>
        {user.role !== 'SuperAdmin' && <p className="flex gap-2 text-xs text-slate-500"><LockKeyhole className="h-4 w-4 shrink-0"/>Only your Super Admin can request paid client accounting.</p>}
      </div>
      <div className="premium-surface overflow-x-auto p-5"><h3 className="mb-4 text-lg font-black text-white">Client accounting workspaces</h3><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Client</th><th>Entity</th><th>Plan</th><th>Status</th><th>Commercial</th></tr></thead><tbody>{workspaces.map((workspace) => <tr key={workspace.id} className="border-t border-white/5"><td className="py-4"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-gold"/><div><p className="font-bold text-white">{workspace.client?.name || 'Client'}</p><p className="text-xs text-slate-500">{workspace.client?.pan || 'PAN unavailable'}</p></div></div></td><td>{workspace.client?.type || '—'}</td><td>{workspace.plan}</td><td><span className={`inline-flex border px-2.5 py-1 text-xs font-bold ${statusClass[workspace.status]}`}>{workspace.status}</span></td><td>{workspace.monthly_price == null ? 'Quote pending' : `₹${Number(workspace.monthly_price).toLocaleString('en-IN')}/month`}</td></tr>)}</tbody></table>{!workspaces.length && <div className="py-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-slate-700"/><p className="mt-3 text-slate-500">No client accounting add-ons requested yet.</p></div>}</div>
    </div>
  </div>;
};

export default AccountingAddon;
