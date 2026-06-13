import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Cable, CheckCircle2, DatabaseZap, KeyRound, Network, RadioTower, RefreshCw, ShieldCheck, Webhook } from 'lucide-react';
import { EOXButton, EOXMetric, TimelineList, VelocityBadge, WorkspacePanel } from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import { User } from '../../types';
import { useOperationalActionExecutor } from '../action-system';
import { FederatedConnector, integrationFabricOrchestrator } from '../integration-fabric';

interface IntegrationDashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}

const statusTone: Record<FederatedConnector['status'], 'fast' | 'risk' | 'neutral'> = {
  healthy: 'fast',
  degraded: 'risk',
  paused: 'neutral',
  'circuit-open': 'risk',
  'pending-governance': 'neutral',
};

const categoryIcon = {
  government: ShieldCheck,
  communication: RadioTower,
  workflow: Webhook,
  finance: DatabaseZap,
  documents: Cable,
  'ai-provider': Network,
  erp: Activity,
};

export const IntegrationDashboard: React.FC<IntegrationDashboardProps> = ({ user, onNavigate, onCommandAction }) => {
  const snapshot = useMemo(() => integrationFabricOrchestrator.generateSnapshot(user), [user]);
  const [connectors, setConnectors] = useState(snapshot.connectors);
  const { executeAction, lastResult, undoLastAction, statusByAction } = useOperationalActionExecutor(user.id, user.role);

  const updateConnector = (connectorId: string, status: FederatedConnector['status']) => {
    setConnectors((prev) => prev.map((connector) => (
      connector.id === connectorId
        ? {
            ...connector,
            status,
            healthScore: status === 'healthy' ? Math.max(connector.healthScore, 90) : connector.healthScore,
            lastSync: status === 'healthy' ? 'just now' : connector.lastSync,
          }
        : connector
    )));
  };

  const validateConnector = (connector: FederatedConnector) => {
    const previous = connectors;
    executeAction('integration-validate', `Validate ${connector.name}`, 'integration-dashboard', {
      run: () => updateConnector(connector.id, connector.trust === 'requires-review' ? 'pending-governance' : 'healthy'),
      undo: () => setConnectors(previous),
    });
  };

  const rotateCredential = (connector: FederatedConnector) => {
    executeAction('integration-credential-rotate', `Rotate ${connector.name}`, 'integration-dashboard', {
      run: () => updateConnector(connector.id, 'pending-governance'),
    });
  };

  const resetCircuit = (connector: FederatedConnector) => {
    const previous = connectors;
    executeAction('integration-circuit-reset', `Reset ${connector.name}`, 'integration-dashboard', {
      run: () => updateConnector(connector.id, connector.trust === 'restricted' ? 'pending-governance' : 'healthy'),
      undo: () => setConnectors(previous),
    });
  };

  const healthyCount = connectors.filter((connector) => connector.status === 'healthy').length;
  const guardedCount = connectors.filter((connector) => connector.status === 'circuit-open' || connector.status === 'pending-governance').length;

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-5 text-white">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Enterprise ecosystem federation</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Integration Fabric</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Adapter-based government connectivity, communication federation, webhook orchestration and credential-governed external coordination.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastResult && (
            <span className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-medium ring-1',
              lastResult.status === 'success' && 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/15',
              lastResult.status === 'permission-denied' && 'bg-amber-500/10 text-amber-300 ring-amber-400/15',
              lastResult.status === 'failure' && 'bg-red-500/10 text-red-300 ring-red-400/15',
              lastResult.status === 'disabled' && 'bg-white/[0.035] text-slate-400 ring-white/[0.045]',
            )}>{lastResult.message}</span>
          )}
          {lastResult?.undo && <EOXButton onClick={undoLastAction}>Undo</EOXButton>}
          <EOXButton onClick={() => onNavigate('governance')}><ShieldCheck className="h-4 w-4" />Governance</EOXButton>
          <EOXButton variant="primary" onClick={() => onCommandAction('open-autonomous-operations')}><Network className="h-4 w-4" />Autonomy</EOXButton>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <EOXMetric label="Reliability" value={`${snapshot.analytics.reliabilityScore}%`} detail="Connector health average" tone="green" />
        <EOXMetric label="Sync Success" value={`${snapshot.analytics.syncSuccessRate}%`} detail="Cross-system sync rate" tone="blue" />
        <EOXMetric label="Avg Latency" value={`${snapshot.analytics.avgLatencyMs}ms`} detail="External response average" tone="gold" />
        <EOXMetric label="Throughput" value={String(snapshot.analytics.externalThroughput)} detail="Federated events/day" tone="blue" />
        <EOXMetric label="Guarded" value={String(guardedCount)} detail="Governed or circuit-open" tone="red" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-5">
          <WorkspacePanel title="Connector Visibility" meta="Runtime-safe integration registry and lifecycle state" live>
            <div className="space-y-3">
              {connectors.map((connector) => {
                const Icon = categoryIcon[connector.category];
                return (
                  <div key={connector.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon className="h-4 w-4 text-gold" />
                          <h3 className="text-sm font-semibold text-white">{connector.name}</h3>
                          <VelocityBadge label="Status" value={connector.status} tone={statusTone[connector.status]} />
                          <VelocityBadge label="Trust" value={connector.trust} tone={connector.trust === 'verified' ? 'fast' : 'risk'} />
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-4">
                          <div className="rounded bg-white/[0.025] px-3 py-2">
                            <p className="text-[10px] text-slate-600">Target</p>
                            <p className="truncate text-xs text-slate-300">{connector.targetSystem}</p>
                          </div>
                          <div className="rounded bg-white/[0.025] px-3 py-2">
                            <p className="text-[10px] text-slate-600">Health</p>
                            <p className="text-xs text-slate-300">{connector.healthScore}%</p>
                          </div>
                          <div className="rounded bg-white/[0.025] px-3 py-2">
                            <p className="text-[10px] text-slate-600">Latency</p>
                            <p className="text-xs text-slate-300">{connector.latencyMs}ms</p>
                          </div>
                          <div className="rounded bg-white/[0.025] px-3 py-2">
                            <p className="text-[10px] text-slate-600">Credential</p>
                            <p className="truncate text-xs text-slate-300">{connector.credentialRef}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-600">{connector.governanceLineage.join(' -> ')} | {connector.rateLimit}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <EOXButton disabled={statusByAction['integration-validate'] === 'loading'} onClick={() => validateConnector(connector)}>
                          <CheckCircle2 className="h-4 w-4" />Validate
                        </EOXButton>
                        <EOXButton onClick={() => rotateCredential(connector)}><KeyRound className="h-4 w-4" />Rotate credential</EOXButton>
                        <EOXButton variant={connector.status === 'circuit-open' ? 'primary' : 'quiet'} onClick={() => resetCircuit(connector)}>
                          <RefreshCw className="h-4 w-4" />Reset circuit
                        </EOXButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Adapter Provider Architecture" meta="Government, communication, webhook and future ecosystem adapters">
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.adapters.map((adapter) => (
                <div key={adapter.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{adapter.provider}</h3>
                    <span className="rounded-full bg-white/[0.035] px-2 py-1 text-[10px] text-slate-400 ring-1 ring-white/[0.045]">{adapter.lifecycle}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{adapter.category} | {adapter.credentialMode}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {adapter.capabilities.map((capability) => (
                      <span key={capability} className="rounded bg-white/[0.03] px-2 py-1 text-[10px] text-slate-500">{capability}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <aside className="space-y-5">
          <WorkspacePanel title="Integration Governance" meta="Vault, permission and external execution controls" live>
            <div className="space-y-3">
              {snapshot.policies.map((policy) => (
                <div key={policy.id} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    <p className="text-xs font-semibold text-white">{policy.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{policy.rationale}</p>
                  <p className="mt-2 text-[10px] leading-4 text-slate-600">{policy.credentialRule}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Runtime Safeguards" meta="Storm, retry and sync-deadlock prevention">
            <div className="space-y-2">
              {snapshot.safeguards.map((safeguard) => (
                <div key={safeguard.id} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{safeguard.label}</p>
                    <span className={cn('rounded-full px-2 py-1 text-[10px]', safeguard.state === 'triggered' ? 'bg-red-500/10 text-red-300' : safeguard.state === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gold/10 text-gold')}>
                      {safeguard.state}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{safeguard.purpose}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="External Workflow Feed" meta="Traceable integration event federation" live>
            <TimelineList
              events={snapshot.events.map((event) => ({
                id: event.id,
                title: event.sourceWorkflow,
                detail: `${event.targetSystem}: ${event.detail}`,
                time: event.time,
                tone: event.status === 'healthy' ? 'green' : event.status === 'circuit-open' || event.status === 'degraded' ? 'red' : 'blue',
              }))}
            />
          </WorkspacePanel>

          <WorkspacePanel title="AI Integration Intelligence" meta="Dependency optimization recommendations">
            <div className="space-y-2">
              {snapshot.recommendations.map((recommendation) => (
                <div key={recommendation} className="rounded-md bg-white/[0.035] p-3 text-xs leading-5 text-slate-400 ring-1 ring-white/[0.045]">
                  {recommendation}
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </aside>
      </div>
    </div>
  );
};

export default IntegrationDashboard;
