import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  GitPullRequestArrow,
  MessageSquare,
  RadioTower,
  ShieldCheck,
  UserCheck,
  Users,
  Workflow,
} from 'lucide-react';
import { ActivityIndicator, EOXButton, EOXMetric, TimelineList, WorkspacePanel } from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import { QuickAccessPin } from '../../services/workspacePreferencesService';
import { User } from '../../types';
import { loadCollaborationMemory, saveCollaborationMemory } from './collaborationMemory';
import { CollaborationEvent, OperatorPresence, TeamCoordinationMetric, WorkflowHandoff } from './types';

interface CollaborativeWorkspaceProps {
  user: User;
  pins: QuickAccessPin[];
  recentNavigation: string[];
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}

const operators: OperatorPresence[] = [
  { id: 'op-1', name: 'Meera', role: 'GST Lead', status: 'active', workspace: 'GST coordination pod', currentWorkflow: 'Aarav Exports variance', lastAction: 'Attached vendor proof' },
  { id: 'op-2', name: 'Rohan', role: 'Notice Owner', status: 'handoff', workspace: 'Notice response room', currentWorkflow: 'Nexus Foods DRC-01A', lastAction: 'Prepared handoff note' },
  { id: 'op-3', name: 'Anika', role: 'Approval Reviewer', status: 'reviewing', workspace: 'Approval release pod', currentWorkflow: 'Helio document batch', lastAction: 'Marked ready for release' },
  { id: 'op-4', name: 'Kunal', role: 'Operations', status: 'idle', workspace: 'Client onboarding', currentWorkflow: 'Prism closure', lastAction: 'Waiting on client confirmation' },
];

const handoffs: WorkflowHandoff[] = [
  { id: 'h1', from: 'Rohan', to: 'Meera', workflow: 'Nexus Foods DRC-01A', summary: 'Client evidence received; GST variance still needs reviewer note.', continuity: 'Next action: confirm vendor response and attach final computation.', status: 'ready' },
  { id: 'h2', from: 'Anika', to: 'Admin', workflow: 'Helio document batch', summary: 'Approval batch is clean. No client-visible blockers.', continuity: 'Next action: release five files and notify client portal.', status: 'accepted' },
  { id: 'h3', from: 'Kunal', to: 'Rohan', workflow: 'Prism onboarding', summary: 'Client master is complete; tax registration proof pending.', continuity: 'Next action: request upload and set 24h SLA.', status: 'needs-context' },
];

const collaborationEvents: CollaborationEvent[] = [
  { id: 'ce1', signal: 'mention', actor: 'Meera', target: 'Rohan', message: '@Rohan vendor proof is attached to the GST variance room.', time: 'now' },
  { id: 'ce2', signal: 'handoff', actor: 'Anika', target: 'Admin', message: 'Approval release handoff accepted with continuity note.', time: '6m' },
  { id: 'ce3', signal: 'escalation', actor: 'System', target: 'GST pod', message: 'SLA ownership chain visible for Nexus Foods notice.', time: '12m' },
  { id: 'ce4', signal: 'insight', actor: 'AI Assist', target: 'Team', message: 'Shared recommendation: batch document releases after GST confirmation.', time: '18m' },
];

const teamMetrics: TeamCoordinationMetric[] = [
  { label: 'Presence', value: '4 live', detail: '2 workflows have multiple operators', tone: 'good' },
  { label: 'Handoffs', value: '3', detail: '1 needs more context', tone: 'risk' },
  { label: 'Mentions', value: '7', detail: 'Batched to avoid notification noise', tone: 'neutral' },
  { label: 'Throughput', value: '24', detail: 'Team actions today', tone: 'good' },
];

export const CollaborativeWorkspace: React.FC<CollaborativeWorkspaceProps> = ({
  user,
  pins,
  recentNavigation,
  onNavigate,
  onCommandAction,
}) => {
  const [memory, setMemory] = useState(() => loadCollaborationMemory(user.id));
  const [activeHandoff, setActiveHandoff] = useState(handoffs[0].id);

  useEffect(() => {
    saveCollaborationMemory(user.id, memory);
  }, [memory, user.id]);

  const activeHandoffRecord = useMemo(() => handoffs.find((handoff) => handoff.id === activeHandoff) || handoffs[0], [activeHandoff]);

  const toneClass = (tone: TeamCoordinationMetric['tone']) =>
    tone === 'good' ? 'text-emerald-300' : tone === 'risk' ? 'text-red-300' : 'text-gold';

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-4 text-white">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Enterprise Collaborative Operations</p>
          <h1 className="text-xl font-bold text-white">Team Coordination Workspace</h1>
        </div>
        <ActivityIndicator label="Shared context live" tone="live" />
        <EOXButton onClick={() => onNavigate('workspace')}><Workflow className="h-4 w-4" />Live workspace</EOXButton>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {teamMetrics.map((metric) => (
          <div key={metric.label} className="border border-slate-800 bg-matte-black-light p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', toneClass(metric.tone))}>{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.15fr)_340px]">
        <div className="space-y-4">
          <WorkspacePanel title="Operator Presence" meta="Live occupancy and workflow awareness" live>
            <div className="space-y-2">
              {operators.map((operator) => (
                <div key={operator.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center border text-xs font-bold', operator.status === 'active' ? 'border-emerald-500/30 text-emerald-300' : operator.status === 'handoff' ? 'border-gold/30 text-gold' : operator.status === 'reviewing' ? 'border-sky-500/30 text-sky-300' : 'border-slate-700 text-slate-500')}>
                      {operator.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{operator.name} | {operator.role}</p>
                      <p className="truncate text-xs text-slate-500">{operator.currentWorkflow}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{operator.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{operator.lastAction}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Team Workload Board" meta="SLA ownership and queue coordination" live>
            <div className="space-y-2">
              {['GST pod: 12 active | 3 SLA risk', 'Notice pod: 7 active | 1 handoff', 'Approvals: 11 ready | 5 releaseable', 'Client onboarding: 4 active | 2 waiting'].map((row) => (
                <button key={row} onClick={() => onNavigate('workspace')} className="flex w-full items-center justify-between border border-slate-800 bg-matte-black p-2 text-left hover:border-gold/40">
                  <span className="text-xs font-bold text-slate-300">{row}</span>
                  <Users className="h-4 w-4 text-gold" />
                </button>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <div className="space-y-4">
          <WorkspacePanel title="Operational Handoff" meta="Continuity summary, owner transfer and responsibility chain" live>
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                {handoffs.map((handoff) => (
                  <button
                    key={handoff.id}
                    onClick={() => setActiveHandoff(handoff.id)}
                    className={cn('w-full border p-2 text-left', activeHandoff === handoff.id ? 'border-gold bg-gold/10' : 'border-slate-800 bg-matte-black hover:border-gold/40')}
                  >
                    <p className="truncate text-xs font-bold text-white">{handoff.workflow}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{handoff.from} to {handoff.to}</p>
                  </button>
                ))}
              </div>
              <div className="border border-slate-800 bg-matte-black p-3">
                <div className="mb-3 flex items-center gap-2">
                  <GitPullRequestArrow className="h-4 w-4 text-gold" />
                  <p className="text-sm font-bold text-white">{activeHandoffRecord.workflow}</p>
                </div>
                <p className="text-xs text-slate-400">{activeHandoffRecord.summary}</p>
                <p className="mt-3 border border-slate-800 bg-matte-black-light p-2 text-xs text-slate-500">{activeHandoffRecord.continuity}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <EOXButton variant="primary" onClick={() => onCommandAction('reassign-work')}><UserCheck className="h-4 w-4" />Accept handoff</EOXButton>
                  <EOXButton onClick={() => onNavigate('tasks')}><Workflow className="h-4 w-4" />Open workflow</EOXButton>
                </div>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Shared Operational Timeline" meta="Collaborative activity, escalations and participation" live>
            <TimelineList
              events={collaborationEvents.map((event) => ({
                id: event.id,
                title: `${event.actor} to ${event.target}`,
                detail: event.message,
                time: event.time,
                tone: event.signal === 'escalation' ? 'red' : event.signal === 'approval' ? 'green' : event.signal === 'insight' ? 'blue' : 'gold',
              }))}
            />
          </WorkspacePanel>

          <WorkspacePanel title="Contextual Operational Communication" meta="Workflow comments, mentions and escalation notes" live>
            <div className="space-y-2">
              {collaborationEvents.filter((event) => event.signal === 'mention' || event.signal === 'escalation').map((event) => (
                <div key={event.id} className="border border-slate-800 bg-matte-black p-3">
                  <p className="text-xs font-bold text-white">{event.actor}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.message}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <input value="@team Add operational note..." readOnly className="min-w-0 flex-1 border border-slate-800 bg-matte-black px-3 py-2 text-xs text-slate-500 outline-none" />
                <EOXButton onClick={() => onCommandAction('open-notification-center')}><MessageSquare className="h-4 w-4" />Attach</EOXButton>
              </div>
            </div>
          </WorkspacePanel>
        </div>

        <aside className="space-y-4">
          <WorkspacePanel title="Shared Intelligence" meta="Team-level risk, recommendations and consensus" live>
            <div className="space-y-2">
              {[
                ['GST risk consensus', 'Review vendor confirmation before releasing approval batch.'],
                ['Ownership clarity', 'Nexus Foods is owned by Rohan until handoff accepted.'],
                ['Team recommendation', 'Batch mentions into 15-minute digest for Notice pod.'],
              ].map(([title, detail]) => (
                <div key={title} className="border border-slate-800 bg-matte-black p-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-gold" />
                    <p className="text-xs font-bold text-white">{title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Collaborative Notifications" meta="Batched alerts, mentions and escalation awareness" live>
            <div className="space-y-2">
              {['3 mentions batched', '1 escalation needs owner', '2 handoffs pending', '5 approval updates grouped'].map((item, index) => (
                <div key={item} className="flex items-center justify-between border border-slate-800 bg-matte-black p-2">
                  <span className="text-xs text-slate-300">{item}</span>
                  {index === 1 ? <AlertTriangle className="h-4 w-4 text-red-300" /> : <Bell className="h-4 w-4 text-gold" />}
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Runtime-Safe Collaboration" meta="Throttle, batch and synchronize without noise" live>
            <div className="space-y-2">
              <EOXMetric label="Batched Alerts" value={String(memory.batchedAlerts)} detail="Noise avoided this session" tone="green" />
              <button
                onClick={() => setMemory((prev) => ({ ...prev, batchedAlerts: prev.batchedAlerts + 1 }))}
                className="w-full border border-slate-800 bg-matte-black p-2 text-xs font-bold text-slate-300 hover:border-gold/40"
              >
                Batch next notification
              </button>
              <p className="text-xs text-slate-500">Sync controls protect the workspace from notification floods and excessive operational churn.</p>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Cross-Domain Federation" meta="GST, workflows, memory, command center and realtime workspace" live>
            <div className="space-y-1.5">
              {[...pins.map((pin) => pin.label), ...recentNavigation, 'GST Intelligence', 'Operational Memory', 'Command Center'].slice(0, 7).map((item) => (
                <div key={item} className="flex items-center gap-2 border border-slate-800 bg-matte-black p-2 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold" />{item}
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </aside>
      </div>
    </div>
  );
};

export default CollaborativeWorkspace;

