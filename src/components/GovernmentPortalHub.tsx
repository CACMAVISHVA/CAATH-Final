import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Landmark, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClients, ClientRow } from '../services/clientService';
import { GOVERNMENT_PORTALS, GovernmentPortalConfig, getClientIdentifier, getGovernmentPortalByTab, openOfficialPortal, recordGovernmentPortalAccess } from '../services/governmentPortalService';

type GovernmentPortalHubProps = { initialPortalTab?: string };

export const GovernmentPortalHub: React.FC<GovernmentPortalHubProps> = ({ initialPortalTab }) => {
  const { user } = useAuth();
  const defaultPortal = getGovernmentPortalByTab(initialPortalTab || 'portal-gst');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [portalByClient, setPortalByClient] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    if (!user?.firmId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getClients(user.firmId);
      const assignedClientIds = new Set(user.assignedClients || []);
      const allowedRows = user.role === 'Staff'
        ? rows.filter((client) => client.assigned_staff_id === user.id || assignedClientIds.has(client.id))
        : rows;
      setClients(allowedRows);
      setPortalByClient((current) => Object.fromEntries(allowedRows.map((client) => [client.id, current[client.id] || defaultPortal.type])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load client portal access.');
    } finally {
      setLoading(false);
    }
  }, [defaultPortal.type, user?.assignedClients, user?.firmId, user?.role]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => [client.name, client.type, client.pan, client.gstin, client.cin_llpin, client.tan].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [clients, search]);

  const portalForClient = (clientId: string): GovernmentPortalConfig => GOVERNMENT_PORTALS.find((portal) => portal.type === portalByClient[clientId]) || defaultPortal;

  const launchPortal = async (client: ClientRow) => {
    if (!user) return;
    const portal = portalForClient(client.id);
    await recordGovernmentPortalAccess({ user, portal, client, action: 'portal_launch' });
    openOfficialPortal(portal);
  };

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-4 text-slate-300 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gold/10 text-gold"><Landmark className="h-5 w-5" /></div>
            <div><h2 className="text-2xl font-bold text-white md:text-3xl">Government Portal Login Desk</h2><p className="mt-1 text-sm text-slate-500">Choose a client and open the correct official government login page.</p></div>
          </div>
          <label className="relative block w-full lg:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
            <input aria-label="Search clients" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, PAN, GSTIN..." className="w-full rounded-md border border-slate-800 bg-matte-black-light py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-gold/50" />
          </label>
        </header>

        <div className="mb-5 flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <div><p className="text-sm font-semibold text-white">Secure launch only</p><p className="mt-1 text-sm text-slate-400">CAATH opens the official portal in a new tab and records the launch. User IDs, passwords, OTPs and CAPTCHAs are not stored or auto-filled here.</p></div>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-800 bg-matte-black-light">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead className="border-b border-slate-800 bg-black/20 text-xs uppercase tracking-wider text-slate-500"><tr><th className="w-16 px-5 py-4">No.</th><th className="px-5 py-4">Client name</th><th className="px-5 py-4">Entity type</th><th className="w-64 px-5 py-4">Government portal</th><th className="w-40 px-5 py-4">Status</th><th className="w-32 px-5 py-4 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">Loading clients...</td></tr>}
                {!loading && error && <tr><td colSpan={6} role="alert" className="px-5 py-12 text-center text-sm text-red-300">{error}</td></tr>}
                {!loading && !error && filteredClients.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No matching clients found.</td></tr>}
                {!loading && !error && filteredClients.map((client, index) => {
                  const portal = portalForClient(client.id);
                  const identifier = getClientIdentifier(client, portal);
                  return <tr key={client.id} className="transition-colors hover:bg-white/[0.025]">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4"><p className="text-sm font-semibold text-white">{client.name}</p><p className="mt-1 text-xs text-slate-600">{client.operational_id || client.pan}</p></td>
                    <td className="px-5 py-4 text-sm text-slate-300">{client.type || 'Not specified'}</td>
                    <td className="px-5 py-4"><select aria-label={`Government portal for ${client.name}`} value={portal.type} onChange={(event) => setPortalByClient((current) => ({ ...current, [client.id]: event.target.value }))} className="w-full rounded-md border border-slate-700 bg-matte-black px-3 py-2.5 text-sm text-white outline-none focus:border-gold/60">{GOVERNMENT_PORTALS.map((option) => <option key={option.type} value={option.type}>{option.name}</option>)}</select></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${identifier ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{identifier ? `${portal.identifierLabel} ready` : `${portal.identifierLabel} missing`}</span></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => launchPortal(client)} className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-bold text-matte-black transition-colors hover:bg-gold-light">Login <ExternalLink className="h-4 w-4" /></button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-600">Portal availability and authentication remain controlled by the respective government website. Complete OTP, CAPTCHA and filing confirmation only on that official website.</p>
      </div>
    </div>
  );
};

export default GovernmentPortalHub;
