import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Gauge, PauseCircle, Play, ShieldCheck, Workflow, Zap } from 'lucide-react';
import { EOXButton, EOXMetric, TimelineList, VelocityBadge, WorkspacePanel } from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import { User } from '../../types';
import { autonomousOperationsOrchestrator, AutonomousExecutionPlan } from '../autonomous-operations';
import { useOperationalActionExecutor } from '../action-system';

interface AutomationDashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}

const stateTone: Record<AutonomousExecutionPlan['state'], 'fast' | 'risk' | 'neutral'> = {
  recommended: 'neutral',
  'auto-approved': 'fast',
  'approval-required': 'risk',
  throttled: 'risk',
  blocked: 'risk',
  executed: 'fast',
  'rolled-back': 'neutral',
};

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ user, onNavigate, onCommandAction }) => {
  const snapshot = useMemo(() => autonomousOperationsOrchestrator.generateSnapshot(user), [user]);
  const [plans, setPlans] = useState(snapshot.plans);
  const { executeAction, lastResult, statusByAction, undoLastAction } = useOperationalActionExecutor(user.id, user.role);

  const updatePlan = (planId: string, state: AutonomousExecutionPlan['state']) => {
    setPlans((prev) => prev.map((plan) => (plan.id === planId ? { ...plan, state, approvalRequired: state === 'approval-required' } : plan)));
  };

  const approvePlan = (plan: AutonomousExecutionPlan) => {
    const previous = plans;
    executeAction('quick-approve', `Approve ${plan.title}`, 'automation-dashboard', {
      run: () => updatePlan(plan.id, 'executed'),
      undo: () => setPlans(previous),
    });
  };

  const throttlePlan = (plan: AutonomousExecutionPlan) => {
    const previous = plans;
    executeAction('split-view-toggle', `Throttle ${plan.title}`, 'automation-dashboard', {
      run: () => updatePlan(plan.id, 'throttled'),
      undo: () => setPlans(previous),
    });
  };

  const openWorkflow = (plan: AutonomousExecutionPlan) => {
    onNavigate(plan.lineage.includes('gst') ? 'gst' : 'tasks');
    onCommandAction(plan.lineage.includes('gst') ? 'open-gst' : 'open-tasks');
  };

  const executedCount = plans.filter((plan) => plan.state === 'executed' || plan.state === 'auto-approved').length;
  const approvalCount = plans.filter((plan) => plan.approvalRequired || plan.state === 'approval-required').length;
  const throttledCount = plans.filter((plan) => plan.state === 'throttled').length;

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-5 text-white">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Enterprise autonomous operations</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Governed Automation Runtime</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Permission-aware, audit-safe automation sequencing with approval gates, throttling, and operator override paths.
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
          <EOXButton onClick={() => onNavigate('automation')}><Workflow className="h-4 w-4" />Automation Center</EOXButton>
          <EOXButton variant="primary" onClick={() => onNavigate('workspace')}><Zap className="h-4 w-4" />Workspace</EOXButton>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <EOXMetric label="Autonomy Trust" value={`${snapshot.analytics.trustScore}%`} detail="Governance confidence" tone="green" />
        <EOXMetric label="Effectiveness" value={`${snapshot.analytics.effectivenessScore}%`} detail="Execution quality" tone="blue" />
        <EOXMetric label="Manual Work Reduced" value={snapshot.analytics.manualWorkReduced} detail="Projected burden drop" tone="gold" />
        <EOXMetric label="Approval Gates" value={String(approvalCount)} detail="Human confirmation needed" tone="red" />
        <EOXMetric label="Storms Prevented" value={String(throttledCount)} detail="Runtime stabilization" tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-5">
          <WorkspacePanel title="Autonomous Execution Registry" meta="Explainable plans, governance gates and runtime-safe sequencing" live>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{plan.title}</h3>
                        <VelocityBadge label="State" value={plan.state} tone={stateTone[plan.state]} />
                        <VelocityBadge label="Confidence" value={`${plan.confidence}%`} tone={plan.confidence > 85 ? 'fast' : 'neutral'} />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{plan.governanceRationale}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {plan.sequence.map((step) => (
                          <div key={step} className="rounded bg-white/[0.025] px-3 py-2 text-xs text-slate-400 ring-1 ring-white/[0.035]">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <EOXButton onClick={() => openWorkflow(plan)}>Open context</EOXButton>
                      <EOXButton
                        variant={plan.approvalRequired ? 'primary' : 'quiet'}
                        disabled={statusByAction['quick-approve'] === 'loading' || plan.state === 'executed'}
                        onClick={() => approvePlan(plan)}
                      >
                        {plan.approvalRequired ? 'Approve gate' : 'Execute'}
                      </EOXButton>
                      <EOXButton onClick={() => throttlePlan(plan)}><PauseCircle className="h-4 w-4" />Throttle</EOXButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Operational Trigger System" meta="SLA, stagnation, approval delay, overload and anomaly triggers" live>
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.triggers.map((trigger) => (
                <div key={trigger.id} className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{trigger.title}</h3>
                    <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium', trigger.severity === 'high' ? 'bg-red-500/10 text-red-300' : trigger.severity === 'medium' ? 'bg-gold/10 text-gold' : 'bg-emerald-500/10 text-emerald-300')}>
                      {trigger.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{trigger.reason}</p>
                  <p className="mt-3 text-[11px] text-slate-600">{trigger.domain} | {trigger.type} | signal {trigger.signalStrength}%</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <aside className="space-y-5">
          <WorkspacePanel title="Governance Controls" meta="Runtime-safe autonomy gates" live>
            <div className="space-y-3">
              {snapshot.policies.map((policy) => (
                <div key={policy.id} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    <p className="text-xs font-semibold text-white">{policy.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{policy.rationale}</p>
                  <p className="mt-2 text-[10px] text-slate-600">Threshold {Math.round(policy.approvalThreshold * 100)}% | throttle {policy.throttleWindowMinutes}m</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Automation Timeline" meta="Traceability and rollback visibility" live>
            <TimelineList
              events={snapshot.timeline.map((event) => ({
                id: event.id,
                title: event.title,
                detail: event.detail,
                time: event.time,
                tone: event.state === 'throttled' || event.state === 'approval-required' ? 'red' : event.state === 'auto-approved' ? 'green' : 'blue',
              }))}
            />
          </WorkspacePanel>

          <WorkspacePanel title="Runtime Health" meta="Loop prevention and stabilization">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                <Gauge className="mb-2 h-4 w-4 text-emerald-300" />
                <p className="text-lg font-semibold text-white">{executedCount}</p>
                <p className="text-[11px] text-slate-600">Safe executions</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                <AlertTriangle className="mb-2 h-4 w-4 text-red-300" />
                <p className="text-lg font-semibold text-white">{throttledCount}</p>
                <p className="text-[11px] text-slate-600">Throttled</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                <CheckCircle2 className="mb-2 h-4 w-4 text-sky-300" />
                <p className="text-lg font-semibold text-white">{snapshot.analytics.accelerationRate}</p>
                <p className="text-[11px] text-slate-600">Acceleration</p>
              </div>
              <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                <Bot className="mb-2 h-4 w-4 text-gold" />
                <p className="text-lg font-semibold text-white">Governed</p>
                <p className="text-[11px] text-slate-600">Autonomy mode</p>
              </div>
            </div>
          </WorkspacePanel>
        </aside>
      </div>
    </div>
  );
};

export default AutomationDashboard;
