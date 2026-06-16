import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Building2, CheckSquare, Copy, ExternalLink, KeyRound, Landmark, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { getClients, ClientRow } from '../services/clientService';
import { getTasks, TaskRow } from '../services/taskService';
import {
  GOVERNMENT_PORTALS,
  GovernmentPortalConfig,
  getClientIdentifier,
  getGovernmentPortalByTab,
  getPortalUsername,
  openOfficialPortal,
  recordGovernmentPortalAccess,
} from '../services/governmentPortalService';

type GovernmentPortalHubProps = {
  initialPortalTab?: string;
};

export const GovernmentPortalHub: React.FC<GovernmentPortalHubProps> = ({ initialPortalTab }) => {
  const { user } = useAuth();
  const [activePortal, setActivePortal] = useState<GovernmentPortalConfig>(() => getGovernmentPortalByTab(initialPortalTab || 'portal-gst'));
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setActivePortal(getGovernmentPortalByTab(initialPortalTab || 'portal-gst'));
  }, [initialPortalTab]);

  const loadHubData = useCallback(async () => {
    if (!user?.firmId) return;
    setLoading(true);
    try {
      const [clientRows, taskRows] = await Promise.all([
        getClients(user.firmId),
        getTasks(user.firmId),
      ]);
      setClients(clientRows);
      setTasks(taskRows);
      if (!selectedClientId && clientRows[0]) setSelectedClientId(clientRows[0].id);
    } catch (error) {
      console.error('Failed to load government portal hub:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, user?.firmId]);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const portalTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.portal_type === activePortal.type) return true;
        if (activePortal.type === 'GST') return task.category === 'GST';
        if (activePortal.type === 'IncomeTax') return task.category === 'Income Tax';
        if (activePortal.type === 'MCA') return task.category === 'MCA' || task.category === 'ROC';
        if (activePortal.type === 'TRACES') return task.category === 'TDS';
        return false;
      })
      .slice(0, 8);
  }, [activePortal, tasks]);

  const copyValue = async (label: string, value: string, task?: TaskRow | null) => {
    if (!value || !user) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
    await recordGovernmentPortalAccess({
      user,
      portal: activePortal,
      client: selectedClient,
      task,
      action: 'identifier_copy',
    });
  };

  const launchPortal = async (task?: TaskRow | null) => {
    if (!user) return;
    await recordGovernmentPortalAccess({
      user,
      portal: activePortal,
      client: selectedClient,
      task,
      action: 'portal_launch',
    });
    openOfficialPortal(activePortal);
  };

  const identifier = getClientIdentifier(selectedClient, activePortal);
  const username = getPortalUsername(selectedClient, activePortal);

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gold/10 text-gold">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold gold-text-gradient">Government Portal Hub</h2>
              <p className="text-sm text-slate-500">Official compliance portal launchpad with client context and audit trail.</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => launchPortal()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-matte-black transition-colors hover:bg-gold-light"
        >
          <ExternalLink className="h-4 w-4" />
          Open Official Portal
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {GOVERNMENT_PORTALS.map((portal) => (
          <button
            key={portal.type}
            type="button"
            onClick={() => setActivePortal(portal)}
            className={cn(
              'rounded-md border p-4 text-left transition-all',
              activePortal.type === portal.type
                ? 'border-gold/50 bg-gold/10 text-white'
                : 'border-slate-800 bg-matte-black-light text-slate-400 hover:border-slate-700 hover:text-white',
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className={cn('rounded-md border px-2 py-1 text-[10px] font-bold uppercase', portal.accentClass)}>
                {portal.shortName}
              </span>
              <ExternalLink className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-sm font-bold">{portal.name}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{portal.officialUrl}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <div className="rounded-md border border-slate-800 bg-matte-black-light p-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-bold text-white">Client Context</h3>
            </div>
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-matte-black p-3 text-sm text-white outline-none focus:ring-1 focus:ring-gold"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>

            <div className="mt-4 space-y-3">
              <IdentifierRow label={activePortal.identifierLabel} value={identifier} copied={copied} onCopy={() => copyValue(activePortal.identifierLabel, identifier)} />
              <IdentifierRow label="PAN" value={selectedClient?.pan || ''} copied={copied} onCopy={() => copyValue('PAN', selectedClient?.pan || '')} />
              <IdentifierRow label="Portal Username" value={username} copied={copied} onCopy={() => copyValue('Portal Username', username)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-matte-black-light p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <h3 className="text-sm font-bold text-white">Security Guardrails</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <p>Official login, OTP, CAPTCHA, and filing confirmation stay inside the government portal.</p>
              <p>No plaintext password is shown or stored by this hub.</p>
              <p>Credential vault and official API integrations can plug into the existing portal services when enabled.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-md border border-slate-800 bg-matte-black-light">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h3 className="text-sm font-bold text-white">{activePortal.name} Work Queue</h3>
                <p className="text-xs text-slate-500">Portal-linked tasks and compliance workflows.</p>
              </div>
              <span className="rounded-md border border-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
                {portalTasks.length} item{portalTasks.length === 1 ? '' : 's'}
              </span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading portal work...</div>
            ) : portalTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No portal-linked tasks yet.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {portalTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-slate-500" />
                        <p className="truncate text-sm font-bold text-white">{task.title}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {task.portal_workflow_type || task.category || 'Compliance'} · {task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN') : 'No deadline'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => launchPortal(task)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-gold/50 hover:text-gold"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Launch
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {activePortal.workflowTypes.map((workflow) => (
              <div key={workflow} className="rounded-md border border-slate-800 bg-matte-black-light p-4">
                <KeyRound className="mb-3 h-4 w-4 text-gold" />
                <p className="text-sm font-bold text-white">{workflow}</p>
                <p className="mt-1 text-xs text-slate-500">Available for task and calendar linkage.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const IdentifierRow: React.FC<{
  label: string;
  value: string;
  copied: string | null;
  onCopy: () => void;
}> = ({ label, value, copied, onCopy }) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-matte-black p-3">
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="truncate font-mono text-sm text-white">{value || '-'}</p>
    </div>
    <button
      type="button"
      onClick={onCopy}
      disabled={!value}
      className="rounded-md p-2 text-slate-500 transition-colors hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
      title={`Copy ${label}`}
    >
      {copied === label ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
    </button>
  </div>
);

export default GovernmentPortalHub;
