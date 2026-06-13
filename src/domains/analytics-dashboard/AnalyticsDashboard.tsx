import React, { useMemo } from 'react';
import { Activity, AlertTriangle, BarChart3, BrainCircuit, Gauge, LineChart, RadioTower, ShieldCheck, TrendingUp, Workflow } from 'lucide-react';
import { EOXButton, EOXMetric, TimelineList, VelocityBadge, WorkspacePanel } from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import { User } from '../../types';
import { operationalAnalyticsOrchestrator, PredictiveInsight } from '../operational-analytics';

interface AnalyticsDashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}

const predictionTone: Record<PredictiveInsight['risk'], 'fast' | 'risk' | 'neutral'> = {
  low: 'fast',
  medium: 'neutral',
  high: 'risk',
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onNavigate, onCommandAction }) => {
  const snapshot = useMemo(() => operationalAnalyticsOrchestrator.generateSnapshot(), []);
  const timelineEvents = snapshot.telemetry.map((signal) => ({
    id: signal.id,
    title: signal.metric,
    detail: `${signal.sourceWorkflow}: ${signal.value} ${signal.unit} | ${signal.lineage.join(' -> ')}`,
    time: signal.sampledAt,
    tone: signal.domain === 'sla' ? 'red' as const : signal.domain === 'governance' ? 'green' as const : signal.domain === 'integration' ? 'blue' as const : 'gold' as const,
  }));

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-5 text-white">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Enterprise operational intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Executive Analytics Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Cross-domain telemetry, predictive workflow intelligence, executive KPIs and explainable operational recommendations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EOXButton onClick={() => onNavigate('workspace')}><Workflow className="h-4 w-4" />Workspace</EOXButton>
          <EOXButton onClick={() => onCommandAction('open-autonomous-operations')}><BrainCircuit className="h-4 w-4" />Autonomy</EOXButton>
          <EOXButton variant="primary" onClick={() => onNavigate('integrations')}><RadioTower className="h-4 w-4" />Integrations</EOXButton>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <EOXMetric label="Operational Health" value={`${snapshot.summary.operationalHealth}%`} detail="Workflow, SLA and queue health" tone="green" />
        <EOXMetric label="Governance Health" value={`${snapshot.summary.governanceHealth}%`} detail="Audit and approval quality" tone="blue" />
        <EOXMetric label="Automation Impact" value={`${snapshot.summary.automationImpact}%`} detail="Manual work reduction quality" tone="gold" />
        <EOXMetric label="Confidence" value={`${snapshot.summary.intelligenceConfidence}%`} detail="Prediction and lineage quality" tone="blue" />
        <EOXMetric label="Freshness" value={snapshot.summary.telemetryFreshness} detail="Telemetry stream state" tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <div className="space-y-5">
          <WorkspacePanel title="Workflow Analytics Engine" meta="Throughput, SLA pressure, escalation frequency and operational velocity" live>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                <BarChart3 className="mb-3 h-5 w-5 text-gold" />
                <p className="text-2xl font-semibold text-white">{snapshot.workflow.throughput}</p>
                <p className="mt-1 text-xs text-slate-500">Workflow throughput/day</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                <Gauge className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-2xl font-semibold text-white">{snapshot.workflow.completionRate}%</p>
                <p className="mt-1 text-xs text-slate-500">Completion intelligence</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                <AlertTriangle className="mb-3 h-5 w-5 text-red-300" />
                <p className="text-2xl font-semibold text-white">{snapshot.workflow.slaAtRisk}</p>
                <p className="mt-1 text-xs text-slate-500">SLA at-risk workflows</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                <Activity className="mb-3 h-5 w-5 text-sky-300" />
                <p className="text-2xl font-semibold text-white">{snapshot.workflow.queuePressure}%</p>
                <p className="mt-1 text-xs text-slate-500">Queue pressure</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                <ShieldCheck className="mb-3 h-5 w-5 text-gold" />
                <p className="text-2xl font-semibold text-white">{snapshot.workflow.escalationFrequency}</p>
                <p className="mt-1 text-xs text-slate-500">Escalations/week</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                <TrendingUp className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-2xl font-semibold text-white">{snapshot.workflow.operationalVelocity}x</p>
                <p className="mt-1 text-xs text-slate-500">Operational velocity</p>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Predictive Operational Intelligence" meta="SLA breach, overload, escalation and anomaly prediction" live>
            <div className="space-y-3">
              {snapshot.predictions.map((prediction) => (
                <div key={prediction.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{prediction.title}</h3>
                    <VelocityBadge label="Risk" value={prediction.risk} tone={predictionTone[prediction.risk]} />
                    <VelocityBadge label="Confidence" value={`${prediction.confidence}%`} tone={prediction.confidence > 85 ? 'fast' : 'neutral'} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{prediction.prediction}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{prediction.rationale}</p>
                  <p className="mt-3 text-[11px] text-slate-600">{prediction.sourceWorkflows.join(' | ')} | {prediction.trace.join(' -> ')}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Executive KPI Framework" meta="Organization-wide measurement with operational context">
            <div className="grid gap-3 md:grid-cols-5">
              {snapshot.executiveKpis.map((kpi) => (
                <div key={kpi.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-xl font-semibold text-white">{kpi.value}</p>
                    <span className={cn('text-xs', kpi.trend.startsWith('-') ? 'text-red-300' : 'text-emerald-300')}>{kpi.trend}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${kpi.score}%` }} />
                  </div>
                  <p className="mt-3 text-[11px] leading-4 text-slate-600">{kpi.context}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <aside className="space-y-5">
          <WorkspacePanel title="Realtime Telemetry" meta="Normalized cross-domain event-stream aggregation" live>
            <TimelineList events={timelineEvents} />
          </WorkspacePanel>

          <WorkspacePanel title="AI Analytics Recommendations" meta="Explainable operational guidance">
            <div className="space-y-3">
              {snapshot.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{recommendation.title}</p>
                    <span className="text-[10px] text-gold">{recommendation.confidence}%</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{recommendation.recommendation}</p>
                  <p className="mt-2 text-[11px] text-slate-600">{recommendation.impact} | {recommendation.lineage.join(' -> ')}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Runtime-Safe Analytics" meta="Batching, throttling, recalibration and conflict controls">
            <div className="space-y-2">
              {snapshot.runtimeControls.map((control) => (
                <div key={control.id} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{control.label}</p>
                    <span className={cn('rounded-full px-2 py-1 text-[10px]', control.state === 'active' ? 'bg-emerald-500/10 text-emerald-300' : control.state === 'watching' ? 'bg-gold/10 text-gold' : 'bg-sky-500/10 text-sky-300')}>{control.state}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{control.purpose}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Operational Intelligence Memory" meta="Longitudinal trend retention">
            <div className="space-y-2">
              {snapshot.memory.map((item) => (
                <div key={item.period} className="grid grid-cols-[70px_1fr_auto] items-center gap-3 rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <p className="text-xs font-semibold text-white">{item.period}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(item.throughput / 2, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500">{item.slaRisk} SLA</span>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </aside>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
