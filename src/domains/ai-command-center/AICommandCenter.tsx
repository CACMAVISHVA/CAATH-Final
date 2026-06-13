import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  GitBranch,
  LockKeyhole,
  Route,
  ShieldCheck,
  Sparkles,
  Workflow,
  XCircle,
} from 'lucide-react';
import { ActivityIndicator, EOXButton, EOXMetric, TimelineList, VelocityBadge, WorkspacePanel } from '../../design-system';
import { useOperationalActionExecutor } from '../action-system';
import { OperationalCopilotOrchestrator, AIRecommendation } from '../ai-copilot';
import type { CommandAction } from '../../services/commandPaletteService';
import type { User } from '../../types';
import { cn } from '../../lib/utils';

interface AICommandCenterProps {
  user: User;
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction | string) => void;
}

const priorityTone: Record<AIRecommendation['priority'], 'risk' | 'fast' | 'neutral'> = {
  critical: 'risk',
  high: 'risk',
  medium: 'neutral',
  low: 'fast',
};

const routeToCommand = (route: string): CommandAction | string => {
  const routeMap: Record<string, CommandAction | string> = {
    gst: 'open-gst',
    collaboration: 'open-collaboration',
    governance: 'open-governance',
    integrations: 'open-integrations',
    analytics: 'open-analytics',
    workspace: 'open-realtime-workspace',
  };
  return routeMap[route] || route;
};

export const AICommandCenter: React.FC<AICommandCenterProps> = ({ user, onNavigate, onCommandAction }) => {
  const orchestrator = useMemo(() => new OperationalCopilotOrchestrator(), []);
  const snapshot = useMemo(() => orchestrator.generateSnapshot(user), [orchestrator, user]);
  const [recommendations, setRecommendations] = useState(snapshot.recommendations);
  const { executeAction, lastResult, statusByAction, undoLastAction } = useOperationalActionExecutor(user.id, user.role);

  const activeRecommendations = recommendations.filter((recommendation) => recommendation.state !== 'dismissed');
  const criticalCount = activeRecommendations.filter((recommendation) => recommendation.priority === 'critical' || recommendation.priority === 'high').length;
  const canGenerateBriefing = user.role === 'SuperAdmin' || user.role === 'Admin';

  const openContext = (recommendation: AIRecommendation) => {
    const command = routeToCommand(recommendation.targetRoute);
    onCommandAction(command);
    if (!String(command).startsWith('open-')) onNavigate(recommendation.targetRoute);
  };

  const acceptRecommendation = (recommendation: AIRecommendation) => {
    const previous = recommendations;
    void executeAction(
      'ai-recommendation-accept',
      `Apply ${recommendation.title}`,
      'ai-command-center',
      {
        run: () => {
          setRecommendations((items) =>
            items.map((item) => item.id === recommendation.id ? { ...item, state: 'accepted' } : item),
          );
          openContext(recommendation);
        },
        undo: () => setRecommendations(previous),
      },
    );
  };

  const dismissRecommendation = (recommendation: AIRecommendation) => {
    const previous = recommendations;
    void executeAction(
      'ai-recommendation-dismiss',
      `Dismiss ${recommendation.title}`,
      'ai-command-center',
      {
        run: () => {
          setRecommendations((items) =>
            items.map((item) => item.id === recommendation.id ? { ...item, state: 'dismissed' } : item),
          );
        },
        undo: () => setRecommendations(previous),
      },
    );
  };

  const generateBriefing = () => {
    void executeAction('ai-briefing-generate', 'Generate executive AI briefing', 'ai-command-center', {
      run: () => onCommandAction('open-analytics'),
    });
  };

  const timelineEvents = [
    {
      id: 'ai-event-1',
      title: 'SLA recommendation generated',
      detail: 'GST variance cluster connected to workflow queue telemetry and institutional memory.',
      time: 'Live',
      tone: 'red' as const,
    },
    {
      id: 'ai-event-2',
      title: 'Governance policy applied',
      detail: 'Approval-chain guidance constrained to Admin and SuperAdmin execution scope.',
      time: '4m',
      tone: 'gold' as const,
    },
    {
      id: 'ai-event-3',
      title: 'Memory source attached',
      detail: 'Notice response playbook linked to similar historical resolution path.',
      time: '9m',
      tone: 'blue' as const,
    },
    {
      id: 'ai-event-4',
      title: 'Runtime safeguard active',
      detail: 'Recommendation throttle held non-critical insight during rapid triage.',
      time: '13m',
      tone: 'green' as const,
    },
  ];

  return (
    <div className="h-full overflow-auto bg-matte-black text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-5 lg:p-7">
        <section className="rounded-md bg-matte-black-light/72 p-5 shadow-xl ring-1 ring-white/[0.045]">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gold/10 text-gold ring-1 ring-gold/15">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500">Enterprise AI Copilot</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white">Operational decision assistance</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Workflow-aware recommendations, executive briefings and governance-constrained AI guidance connected to CAATH operations.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActivityIndicator label="AI runtime governed" />
              <ActivityIndicator label={`${criticalCount} priority insights`} tone={criticalCount ? 'risk' : 'idle'} />
              <EOXButton onClick={() => onCommandAction('open-realtime-workspace')}><Workflow className="h-4 w-4" />Workspace</EOXButton>
              <EOXButton variant="primary" disabled={!canGenerateBriefing} onClick={generateBriefing}>
                <Sparkles className="h-4 w-4" />
                {canGenerateBriefing ? 'Executive brief' : 'Briefing gated'}
              </EOXButton>
            </div>
          </div>
          {lastResult && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-white/[0.035] px-3 py-2 text-xs text-slate-400 ring-1 ring-white/[0.045]">
              <span className={cn('font-semibold', lastResult.status === 'success' ? 'text-emerald-300' : lastResult.status === 'failure' ? 'text-red-300' : 'text-gold')}>
                {lastResult.message}
              </span>
              {lastResult.undo && <EOXButton className="py-1" onClick={undoLastAction}>Undo</EOXButton>}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <EOXMetric label="AI trust score" value={`${snapshot.analytics.trustScore}%`} detail="governance-safe recommendation quality" tone="green" />
          <EOXMetric label="Effectiveness" value={`${snapshot.analytics.recommendationEffectiveness}%`} detail="accepted guidance completion impact" tone="gold" />
          <EOXMetric label="Workflow lift" value={`${snapshot.analytics.workflowOptimizationImpact}%`} detail="estimated execution acceleration" tone="blue" />
          <EOXMetric label="Adoption" value={`${snapshot.analytics.adoptionRate}%`} detail="operator usage across command surfaces" tone="gold" />
          <EOXMetric label="Compliance" value={`${snapshot.analytics.governanceCompliance}%`} detail="permission and audit coverage" tone="green" />
        </section>

        <section className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.9fr)]">
          <WorkspacePanel
            title="Workflow-Aware AI Assistance"
            meta={`${activeRecommendations.length} active recommendations | ${snapshot.context.governanceScope}`}
            live
          >
            <div className="space-y-3">
              {activeRecommendations.map((recommendation) => {
                const canApply = recommendation.permissionScope.includes(user.role);
                const isLoading = statusByAction['ai-recommendation-accept'] === 'loading';
                return (
                  <article key={recommendation.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1',
                        recommendation.priority === 'critical' ? 'bg-red-500/10 text-red-300 ring-red-400/15' : 'bg-gold/10 text-gold ring-gold/15',
                      )}>
                        {recommendation.priority === 'critical' ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{recommendation.title}</h3>
                          <VelocityBadge label="Confidence" value={`${Math.round(recommendation.confidence * 100)}%`} tone={priorityTone[recommendation.priority]} />
                          <VelocityBadge label="Priority" value={recommendation.priority} tone={priorityTone[recommendation.priority]} />
                          {recommendation.state === 'accepted' && <VelocityBadge label="State" value="accepted" tone="fast" />}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{recommendation.summary}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-md bg-matte-black/30 p-3">
                        <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-300"><Gauge className="h-4 w-4 text-gold" />Reasoning</p>
                        <p className="text-xs leading-5 text-slate-500">{recommendation.reasoning}</p>
                      </div>
                      <div className="rounded-md bg-matte-black/30 p-3">
                        <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-300"><GitBranch className="h-4 w-4 text-sky-300" />Lineage</p>
                        <p className="text-xs leading-5 text-slate-500">{recommendation.contextLineage.join(' | ')}</p>
                      </div>
                      <div className="rounded-md bg-matte-black/30 p-3">
                        <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-300" />Governance</p>
                        <p className="text-xs leading-5 text-slate-500">{recommendation.governanceRationale}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">Next action:</span> {recommendation.nextAction}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <EOXButton disabled={!canApply} onClick={() => openContext(recommendation)}><Route className="h-4 w-4" />Open context</EOXButton>
                        <EOXButton
                          variant="primary"
                          disabled={!canApply || isLoading || recommendation.state === 'accepted'}
                          onClick={() => acceptRecommendation(recommendation)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {canApply ? 'Apply guidance' : 'Permission gated'}
                        </EOXButton>
                        <EOXButton onClick={() => dismissRecommendation(recommendation)}><XCircle className="h-4 w-4" />Dismiss</EOXButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </WorkspacePanel>

          <div className="space-y-5">
            <WorkspacePanel title="Executive Decision Assistance" meta="AI-generated operational narratives" live>
              <div className="space-y-3">
                {snapshot.executiveBriefings.map((briefing) => (
                  <div key={briefing.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">{briefing.title}</h3>
                      <VelocityBadge label="Conf" value={`${Math.round(briefing.confidence * 100)}%`} tone="fast" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{briefing.narrative}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-300">{briefing.decisionSupport}</p>
                    <p className="mt-2 text-[11px] text-slate-600">{briefing.metricLineage.join(' | ')}</p>
                  </div>
                ))}
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Governance-Aware AI Runtime" meta="Policies and safeguards">
              <div className="space-y-4">
                {snapshot.governancePolicies.map((policy) => (
                  <div key={policy.id} className="rounded-md bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{policy.name}</p>
                      <VelocityBadge label="Policy" value={policy.enforcement} tone={policy.enforcement === 'blocking' ? 'risk' : 'neutral'} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{policy.description}</p>
                  </div>
                ))}
                <div className="grid gap-2">
                  {snapshot.safeguards.map((safeguard) => (
                    <div key={safeguard.id} className="flex gap-3 rounded-md bg-matte-black/30 p-3">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300">{safeguard.name}</p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-600">{safeguard.purpose}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="AI Activity Feed" meta="Traceable recommendation events" live>
              <TimelineList events={timelineEvents} />
            </WorkspacePanel>
          </div>
        </section>
      </div>
    </div>
  );
};
