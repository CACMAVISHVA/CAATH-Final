import React, { useMemo } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileClock,
  GitBranch,
  LockKeyhole,
  Network,
  ShieldCheck,
  UserCheck,
  Workflow,
} from 'lucide-react';
import { ActivityIndicator, EOXButton, EOXMetric, TimelineList, WorkspacePanel } from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import { User } from '../../types';
import {
  evaluateOperationalPermission,
  governancePolicies,
  GovernanceEvent,
  PermissionContext,
} from '../permission-intelligence';

interface GovernanceDashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}

const governanceEvents: GovernanceEvent[] = [
  { id: 'ge-1', category: 'permission', actor: 'Admin', title: 'Permission evaluated', detail: 'GST variance release marked review-required due to approval gate.', time: 'now' },
  { id: 'ge-2', category: 'approval', actor: 'Anika', title: 'Approval chain advanced', detail: 'Document batch moved from reviewer to SuperAdmin checkpoint.', time: '7m' },
  { id: 'ge-3', category: 'collaboration', actor: 'Meera', title: 'Governed comment added', detail: 'Restricted note attached to Nexus Foods escalation room.', time: '13m' },
  { id: 'ge-4', category: 'ai', actor: 'AI Assist', title: 'Recommendation audited', detail: 'Suggested vendor confirmation before approval release.', time: '18m' },
  { id: 'ge-5', category: 'override', actor: 'SuperAdmin', title: 'Workflow override recorded', detail: 'SLA owner changed with traceability note.', time: '31m' },
];

const approvalChain = [
  { role: 'Staff', owner: 'Rohan', state: 'Prepared evidence', status: 'complete' },
  { role: 'Admin', owner: 'Meera', state: 'Reviewing variance', status: 'active' },
  { role: 'SuperAdmin', owner: 'Anika', state: 'Release gate', status: 'pending' },
  { role: 'Client', owner: 'Portal', state: 'Client-visible', status: 'locked' },
];

const accountability = [
  ['Aarav Exports GST', 'Meera', 'Admin review', '1h 42m'],
  ['Nexus Foods notice', 'Rohan', 'Escalated', 'Today'],
  ['Helio document batch', 'Anika', 'Approval gate', '4h'],
  ['Prism onboarding', 'Kunal', 'Pending client proof', '1d'],
];

export const GovernanceDashboard: React.FC<GovernanceDashboardProps> = ({ user, onNavigate, onCommandAction }) => {
  const permissionContext: PermissionContext = {
    role: user.role,
    workspace: 'Collaborative GST workspace',
    workflowState: 'approval-gate',
    sensitivity: 'compliance-sensitive',
    escalationActive: true,
  };

  const decisions = useMemo(
    () => [
      evaluateOperationalPermission('Release client-visible document', permissionContext),
      evaluateOperationalPermission('Mention operator in escalation', { ...permissionContext, workflowState: 'escalated' }),
      evaluateOperationalPermission('Accept workflow handoff', { ...permissionContext, sensitivity: 'restricted' }),
    ],
    [user.role],
  );

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-4 text-white">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Enterprise Governance & Operational Trust</p>
          <h1 className="text-xl font-bold text-white">Governance Dashboard</h1>
        </div>
        <ActivityIndicator label="Audit-safe workspace" tone="live" />
        <EOXButton onClick={() => onNavigate('collaboration')}><Network className="h-4 w-4" />Governed collaboration</EOXButton>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <EOXMetric label="Trust Score" value="91" detail="Contextual access health" tone="green" />
        <EOXMetric label="Review Gates" value="6" detail="Approval checkpoints active" tone="gold" />
        <EOXMetric label="Audit Coverage" value="98%" detail="Traceable operational events" tone="green" />
        <EOXMetric label="Friction" value="12%" detail="Governance bottleneck risk" tone="blue" />
        <EOXMetric label="Overrides" value="2" detail="All traceable" tone="red" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(440px,1.2fr)_340px]">
        <div className="space-y-4">
          <WorkspacePanel title="Permission Intelligence" meta="Explainable contextual access decisions" live>
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div key={decision.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{decision.action}</p>
                    <span className={cn('text-xs font-bold uppercase', decision.decision === 'allow' ? 'text-emerald-300' : decision.decision === 'review' ? 'text-gold' : 'text-red-300')}>
                      {decision.decision}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{decision.reasoning}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500">
                    <span>Context: {decision.accessContext}</span>
                    <span>State: {decision.workflowState}</span>
                    <span>Impact: {decision.operationalImpact}</span>
                    <span>Lineage: {decision.permissionLineage.join(' -> ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Governance Policies" meta="Workflow, approval, escalation and collaboration controls" live>
            <div className="space-y-2">
              {governancePolicies.map((policy) => (
                <div key={policy.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    <p className="text-sm font-bold text-white">{policy.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{policy.scope} | {policy.checkpoint}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{policy.enforcement}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <div className="space-y-4">
          <WorkspacePanel title="Governance Timeline" meta="Permission changes, approvals, overrides and escalations" live>
            <TimelineList
              events={governanceEvents.map((event) => ({
                id: event.id,
                title: `${event.actor}: ${event.title}`,
                detail: event.detail,
                time: event.time,
                tone: event.category === 'override' || event.category === 'escalation' ? 'red' : event.category === 'approval' ? 'green' : event.category === 'ai' ? 'blue' : 'gold',
              }))}
            />
          </WorkspacePanel>

          <WorkspacePanel title="Workflow Approval Infrastructure" meta="Chains, delegated approvals, gates and escalation flow" live>
            <div className="grid gap-2 md:grid-cols-4">
              {approvalChain.map((step, index) => (
                <div key={step.role} className="border border-slate-800 bg-matte-black p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Step {index + 1}</p>
                  <p className="mt-1 text-sm font-bold text-white">{step.role}</p>
                  <p className="mt-1 text-xs text-slate-500">{step.owner}</p>
                  <p className={cn('mt-2 text-xs font-bold uppercase', step.status === 'complete' ? 'text-emerald-300' : step.status === 'active' ? 'text-gold' : step.status === 'locked' ? 'text-slate-500' : 'text-sky-300')}>{step.status}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <EOXButton variant="primary" onClick={() => onCommandAction('quick-approve')}><CheckCircle2 className="h-4 w-4" />Approve checkpoint</EOXButton>
              <EOXButton onClick={() => onCommandAction('create-handoff')}><UserCheck className="h-4 w-4" />Delegate</EOXButton>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Accountability Surface" meta="Ownership, SLA chains and action attribution" live>
            <div className="space-y-2">
              {accountability.map(([workflow, owner, state, sla]) => (
                <div key={workflow} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border border-slate-800 bg-matte-black p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{workflow}</p>
                    <p className="truncate text-xs text-slate-500">{owner} | {state}</p>
                  </div>
                  <span className="self-center text-xs font-bold text-gold">{sla}</span>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <aside className="space-y-4">
          <WorkspacePanel title="Auditability Infrastructure" meta="Lineage, action history, AI audit and event streams" live>
            <div className="space-y-2">
              {[
                ['Immutable trail', 'All governance events attach actor, context and timestamp.'],
                ['Workflow lineage', 'Approval and escalation state transitions are visible.'],
                ['AI audit', 'Recommendations retain rationale and operator handoff.'],
                ['Collaboration traceability', 'Comments and mentions are workflow-scoped.'],
              ].map(([title, detail]) => (
                <div key={title} className="border border-slate-800 bg-matte-black p-2">
                  <div className="flex items-center gap-2">
                    <FileClock className="h-4 w-4 text-gold" />
                    <p className="text-xs font-bold text-white">{title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Runtime-Safe Governance" meta="Conflict prevention, throttling and approval optimization" live>
            <div className="space-y-2">
              <div className="border border-slate-800 bg-matte-black p-2">
                <LockKeyhole className="mb-1 h-4 w-4 text-emerald-300" />
                <p className="text-xs text-slate-400">Permission cache avoids repeated access churn during queue traversal.</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-2">
                <AlertTriangle className="mb-1 h-4 w-4 text-gold" />
                <p className="text-xs text-slate-400">Approval optimization prevents deadlocks and escalation loops.</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-2">
                <GitBranch className="mb-1 h-4 w-4 text-sky-300" />
                <p className="text-xs text-slate-400">Governance throttling batches low-risk policy events.</p>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Cross-Domain Governance Federation" meta="GST, collaboration, workflows, memory and realtime runtime" live>
            <div className="space-y-1.5">
              {['GST Intelligence', 'Collaborative Workspace', 'Workflow Orchestration', 'Operational Memory', 'Escalation Systems', 'Realtime Runtime', 'Cognitive Operations'].map((item) => (
                <div key={item} className="flex items-center gap-2 border border-slate-800 bg-matte-black p-2 text-xs text-slate-400">
                  <Workflow className="h-3.5 w-3.5 text-gold" />{item}
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Governance Analytics" meta="Efficiency, friction, coverage and trust indicators" live>
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-slate-800 bg-matte-black p-2">
                <BrainCircuit className="mb-1 h-4 w-4 text-gold" />
                <p className="text-lg font-bold text-white">84%</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Approval efficiency</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-2">
                <ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" />
                <p className="text-lg font-bold text-white">98%</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Audit coverage</p>
              </div>
            </div>
          </WorkspacePanel>
        </aside>
      </div>
    </div>
  );
};

export default GovernanceDashboard;

