import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, KeyRound, Landmark, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClients, ClientRow } from '../services/clientService';
import { GOVERNMENT_PORTALS, GovernmentPortalConfig, getClientIdentifier, getGovernmentPortalByTab, openOfficialPortal, recordGovernmentPortalAccess } from '../services/governmentPortalService';
import { getClientPortalCredentials, PortalCredentialSummary } from '../services/portalLauncherService';
import { launchPortalWithAutofill } from '../services/portals/portalAssistService';
import { PortalCredentialModal } from './PortalCredentialModal';

type GovernmentPortalHubProps = { initialPortalTab?: string };

export const GovernmentPortalHub: React.FC<GovernmentPortalHubProps> = ({ initialPortalTab }) => {
  const { user } = useAuth();
  const defaultPortal = getGovernmentPortalByTab(initialPortalTab || 'portal-gst');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [portalByClient, setPortalByClient] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [credentialsByClient, setCredentialsByClient] = useState<Record<string, PortalCredentialSummary[]>>({});
  const [credentialSetup, setCredentialSetup] = useState<{ client: ClientRow; portal: GovernmentPortalConfig } | null>(null);
  const [launchingClientId, setLaunchingClientId] = useState<string | null>(null);

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
      const credentialResults = await Promise.all(allowedRows.map(async (client) => {
        try {
          return [client.id, await getClientPortalCredentials(client.id)] as const;
        } catch {
          return [client.id, []] as const;
        }
      }));
      setCredentialsByClient(Object.fromEntries(credentialResults));
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
    const credential = (credentialsByClient[client.id] || []).find((item) => item.portal_type === portal.type);
    if (!credential) {
      setCredentialSetup({ client, portal });
      setNotice({ type: 'warning', message: `Add the ${portal.shortName} User ID and password once to enable assisted login.` });
      return;
    }

    setLaunchingClientId(client.id);
    setNotice(null);
    try {
      const result = await launchPortalWithAutofill({ credentialId: credential.id, portal, user });
      if (!result.launched) {
        openOfficialPortal(portal);
        setNotice({ type: 'warning', message: `${result.message} The official portal was opened without auto-fill. Install CAATH Portal Assist to enable secure filling.` });
      } else {
        setNotice({ type: 'success', message: result.message });
      }
      await recordGovernmentPortalAccess({ user, portal, client, action: 'portal_launch' });
    } catch (launchError) {
      setNotice({ type: 'error', message: launchError instanceof Error ? launchError.message : 'Unable to start the portal login.' });
    } finally {
      setLaunchingClientId(null);
    }
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
          <div className="flex-1"><p className="text-sm font-semibold text-white">Secure assisted login</p><p className="mt-1 text-sm text-slate-400">CAATH can securely fill the saved User ID and password on the matching official portal. CAPTCHA, OTP and the final Login click always remain with the user.</p></div>
          <a href="/downloads/caath-portal-assist.zip" download className="inline-flex shrink-0 items-center gap-2 rounded-md border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/10"><Download className="h-4 w-4" />Portal Assist</a>
        </div>

        {notice && <div role="status" className={`mb-5 rounded-md border p-4 text-sm ${notice.type === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : notice.type === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-200' : 'border-amber-500/25 bg-amber-500/10 text-amber-100'}`}>{notice.message}</div>}

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
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${(credentialsByClient[client.id] || []).some((item) => item.portal_type === portal.type) ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : identifier ? 'border-sky-500/20 bg-sky-500/10 text-sky-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{(credentialsByClient[client.id] || []).some((item) => item.portal_type === portal.type) ? 'Login ready' : identifier ? `${portal.identifierLabel} ready` : `${portal.identifierLabel} missing`}</span></td>
                    <td className="px-5 py-4 text-right"><button type="button" disabled={launchingClientId === client.id} onClick={() => launchPortal(client)} className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-bold text-matte-black transition-colors hover:bg-gold-light disabled:opacity-50">{(credentialsByClient[client.id] || []).some((item) => item.portal_type === portal.type) ? 'Login' : 'Add Login'} {(credentialsByClient[client.id] || []).some((item) => item.portal_type === portal.type) ? <ExternalLink className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-600">Portal availability and authentication remain controlled by the respective government website. Complete OTP, CAPTCHA and filing confirmation only on that official website.</p>
      </div>
      <PortalCredentialModal
        client={credentialSetup?.client || null}
        portal={credentialSetup?.portal || null}
        user={user!}
        onClose={() => setCredentialSetup(null)}
        onSaved={(credential) => {
          setCredentialsByClient((current) => ({
            ...current,
            [credential.client_id]: [...(current[credential.client_id] || []).filter((item) => item.portal_type !== credential.portal_type), credential],
          }));
          setNotice({ type: 'success', message: 'Portal login saved securely. Click Login to open the official portal and fill the credentials.' });
        }}
      />
    </div>
  );
};

export default GovernmentPortalHub;
