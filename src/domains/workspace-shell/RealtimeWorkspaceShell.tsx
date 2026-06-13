import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Command,
  Gauge,
  MessageSquare,
  PanelLeft,
  Pin,
  RadioTower,
  Rows3,
  SplitSquareHorizontal,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import {
  ActivityIndicator,
  DensityMode,
  DockRail,
  EOXButton,
  EOXMetric,
  QuickActionCluster,
  TimelineList,
  VelocityBadge,
  VelocityQueueRow,
  WorkspacePanel,
} from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import { QuickAccessPin } from '../../services/workspacePreferencesService';
import { User } from '../../types';
import { useOperationalActionExecutor } from '../action-system';
import { loadVelocityMemory, rememberVelocityAction, saveVelocityMemory } from '../operational-velocity';
import { CollaborationSnapshot } from '../collaborative-workspace';
import { GovernanceSnapshot } from '../governance-dashboard';
import { KnowledgeSnapshot } from '../learning-dashboard';
import { loadWorkspaceSession, saveWorkspaceSession } from './workspacePersistence';
import { WorkspaceLayout, WorkspacePanelId, WorkspaceSessionState } from './types';

interface RealtimeWorkspaceShellProps {
  user: User;
  pins: QuickAccessPin[];
  recentNavigation: string[];
  onNavigate: (tab: string) => void;
  onOpenSearch: () => void;
  onCommandAction: (action: CommandAction) => void;
}

const initialLiveTasks = [
  { id: 'lt-1', title: 'GSTR-3B variance review', client: 'Aarav Exports', owner: 'Meera', sla: '1h 42m', risk: 'High', status: 'Moving to review' },
  { id: 'lt-2', title: 'Notice response draft', client: 'Nexus Foods', owner: 'Rohan', sla: 'Today', risk: 'High', status: 'Awaiting evidence' },
  { id: 'lt-3', title: 'Approval release batch', client: 'Helio Textiles', owner: 'Anika', sla: '4h', risk: 'Medium', status: 'Ready' },
  { id: 'lt-4', title: 'Client onboarding closure', client: 'Prism Advisors', owner: 'Kunal', sla: 'Tomorrow', risk: 'Low', status: 'In progress' },
  { id: 'lt-5', title: 'ITC reconciliation handoff', client: 'Urban Looms', owner: 'Dev', sla: '2h', risk: 'Medium', status: 'Assigned' },
];

const timelineEvents = [
  { id: 'tl-1', title: 'Task moved', detail: 'Aarav Exports variance review entered admin review.', time: 'now', tone: 'green' as const },
  { id: 'tl-2', title: 'Escalation updated', detail: 'Nexus Foods notice has owner handoff visibility enabled.', time: '4m', tone: 'red' as const },
  { id: 'tl-3', title: 'Approval activity', detail: 'Three records were marked quick-release ready.', time: '9m', tone: 'blue' as const },
  { id: 'tl-4', title: 'Telemetry overlay', detail: 'GST workload lane crossed compact mode threshold.', time: '14m', tone: 'gold' as const },
];

const comments = [
  { id: 'c1', author: 'Meera', text: '@Rohan client evidence received. Moving GST variance to review.', time: '2m' },
  { id: 'c2', author: 'Anika', text: '@Admin approval batch is clean. Ready for release.', time: '8m' },
  { id: 'c3', author: 'Kunal', text: 'Handoff note added for Prism onboarding closure.', time: '16m' },
];

const dockItems: Array<{ id: WorkspacePanelId; label: string; icon: React.FC<{ className?: string }>; count?: number }> = [
  { id: 'tasks', label: 'Live tasks', icon: Workflow, count: 5 },
  { id: 'notices', label: 'Notices', icon: Bell, count: 2 },
  { id: 'intelligence', label: 'Intelligence', icon: BrainCircuit },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle, count: 3 },
  { id: 'activity', label: 'Activity', icon: RadioTower },
  { id: 'alerts', label: 'Alerts', icon: Zap, count: 4 },
  { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

export const RealtimeWorkspaceShell: React.FC<RealtimeWorkspaceShellProps> = ({
  user,
  pins,
  recentNavigation,
  onNavigate,
  onOpenSearch,
  onCommandAction,
}) => {
  const [session, setSession] = useState<WorkspaceSessionState>(() => loadWorkspaceSession(user.id, user.role));
  const [optimisticStatus, setOptimisticStatus] = useState('Live sync active');
  const [selectedQueueIndex, setSelectedQueueIndex] = useState(0);
  const [operationalTasks, setOperationalTasks] = useState(initialLiveTasks);
  const [velocityMemory, setVelocityMemory] = useState(() => loadVelocityMemory(user.id));
  const { executeAction, lastResult, statusByAction, undoLastAction } = useOperationalActionExecutor(user.id, user.role);

  useEffect(() => {
    saveWorkspaceSession(user.id, session);
  }, [session, user.id]);

  useEffect(() => {
    saveVelocityMemory(user.id, velocityMemory);
  }, [user.id, velocityMemory]);

  useEffect(() => {
    const handleWorkspaceHotkey = (event: Event) => {
      const detail = (event as CustomEvent<{ panel?: WorkspacePanelId; layout?: WorkspaceLayout; mode?: WorkspaceSessionState['mode']; queue?: 'next' | 'previous' }>).detail;
      if (detail?.panel) setSessionValue('activePanel', detail.panel);
      if (detail?.layout) setSessionValue('activeLayout', detail.layout);
      if (detail?.mode) setSessionValue('mode', detail.mode);
      if (detail?.queue === 'next') setSelectedQueueIndex((prev) => Math.min(prev + 1, operationalTasks.length - 1));
      if (detail?.queue === 'previous') setSelectedQueueIndex((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener('caath:workspace-hotkey', handleWorkspaceHotkey);
    return () => window.removeEventListener('caath:workspace-hotkey', handleWorkspaceHotkey);
  }, [operationalTasks.length]);

  const setSessionValue = <K extends keyof WorkspaceSessionState>(key: K, value: WorkspaceSessionState[K]) => {
    setSession((prev) => ({ ...prev, [key]: value }));
  };

  const layoutColumns = useMemo(() => {
    if (session.mode === 'focus') return 'xl:grid-cols-[minmax(0,1fr)_320px]';
    if (!session.splitView) return 'xl:grid-cols-[minmax(0,1fr)_320px]';
    if (session.activeLayout === 'execution') return 'xl:grid-cols-[minmax(360px,0.9fr)_minmax(360px,1.1fr)_320px]';
    if (session.activeLayout === 'executive') return 'xl:grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)_minmax(320px,0.8fr)]';
    return 'xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.2fr)_340px]';
  }, [session.activeLayout, session.mode, session.splitView]);

  const updatePanelInteraction = (panelId: string, nextState: WorkspaceSessionState['panelStates'][string], interaction: 'collapse' | 'dock' | 'maximize') => {
    const action = interaction === 'collapse'
      ? nextState.collapsed ? 'panel-collapse' : 'panel-expand'
      : interaction === 'dock'
        ? nextState.docked ? 'panel-dock' : 'panel-undock'
        : nextState.maximized ? 'panel-maximize' : 'panel-restore';

    executeAction(action, panelId, 'workspace-panel', {
      run: () => {
        setSession((prev) => ({
          ...prev,
          focusedPanelId: nextState.maximized ? panelId : prev.focusedPanelId === panelId ? undefined : prev.focusedPanelId,
          panelStates: {
            ...prev.panelStates,
            [panelId]: nextState,
          },
        }));
        setOptimisticStatus(`${panelId} ${action.replace('panel-', '')}`);
      },
    });
  };

  const panelInteraction = (panelId: string) => ({
    interactionState: session.panelStates[panelId],
    onInteractionChange: (next: WorkspaceSessionState['panelStates'][string], interaction: 'collapse' | 'dock' | 'maximize') => updatePanelInteraction(panelId, next, interaction),
  });

  const rapidAction = (action: CommandAction, label: string) => {
    const selectedTask = operationalTasks[selectedQueueIndex];
    const previousTasks = operationalTasks;
    executeAction(action, label, 'workspace-action', {
      run: () => {
        setOptimisticStatus(`${label} processing`);
        setVelocityMemory((prev) => rememberVelocityAction(prev, action, label));

        if (action === 'assign-work' || action === 'reassign-work') {
          setOperationalTasks((prev) => prev.map((task, index) => (
            index === selectedQueueIndex ? { ...task, owner: user.name || user.email || 'Current operator', status: 'Assigned locally' } : task
          )));
        } else if (action === 'bulk-resolve') {
          setOperationalTasks((prev) => prev.map((task, index) => (
            index === selectedQueueIndex ? { ...task, risk: 'Low', status: 'Resolved pending sync', sla: 'Complete' } : task
          )));
        } else if (action === 'quick-approve') {
          setOperationalTasks((prev) => prev.map((task, index) => (
            index === selectedQueueIndex ? { ...task, status: 'Approved locally', risk: 'Low' } : task
          )));
        } else if (action === 'create-task') {
          setOperationalTasks((prev) => [
            { id: `lt-${Date.now()}`, title: 'New operational task', client: 'Workspace intake', owner: user.name || 'Current operator', sla: 'Today', risk: 'Medium', status: 'Created locally' },
            ...prev,
          ]);
          setSelectedQueueIndex(0);
        } else if (action.startsWith('open-')) {
          onCommandAction(action);
        }

        if (!action.startsWith('open-')) onCommandAction(action);
        window.setTimeout(() => setOptimisticStatus('Live sync active'), 1200);
      },
      undo: selectedTask ? () => setOperationalTasks(previousTasks) : undefined,
    });
  };

  const renderTaskRows = (density: DensityMode) => (
    <div className="space-y-2">
      {operationalTasks.map((task, index) => (
        <VelocityQueueRow
          key={task.id}
          title={task.title}
          meta={`${task.client} | ${task.owner} | ${task.status}`}
          sla={task.sla}
          selected={selectedQueueIndex === index}
          pressure={task.risk === 'High' ? 'high' : task.risk === 'Medium' ? 'medium' : 'low'}
          onOpen={() => {
            setSelectedQueueIndex(index);
            setVelocityMemory((prev) => rememberVelocityAction(prev, 'open-tasks', `Opened ${task.client}`));
            rapidAction('open-tasks', `Opened ${task.client}`);
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('flex h-full overflow-hidden bg-matte-black text-white', session.panelStates.workspace?.detached && 'm-3 h-[calc(100%-1.5rem)] rounded-md shadow-2xl ring-1 ring-gold/20')}>
      <DockRail
        items={dockItems.map((item) => ({ ...item, active: session.activePanel === item.id }))}
        onSelect={(id) => setSessionValue('activePanel', id as WorkspacePanelId)}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="h-36 bg-matte-black/82 px-5 py-4 shadow-sm ring-1 ring-white/[0.04] backdrop-blur">
          <div className="flex h-full flex-col justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-start gap-4">
              <div className="min-w-[220px] flex-1">
                <p className="text-[11px] font-medium tracking-normal text-slate-500">Enterprise realtime operational workspace</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-white">Live Workspace OS</h1>
                  <ActivityIndicator label={optimisticStatus} tone="live" />
                  {lastResult && (
                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-medium ring-1',
                      lastResult.status === 'success' && 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/15',
                      lastResult.status === 'failure' && 'bg-red-500/10 text-red-300 ring-red-400/15',
                      lastResult.status === 'permission-denied' && 'bg-amber-500/10 text-amber-300 ring-amber-400/15',
                      lastResult.status === 'disabled' && 'bg-white/[0.035] text-slate-400 ring-white/[0.045]',
                    )}>
                      {lastResult.message}
                    </span>
                  )}
                  {lastResult?.undo && (
                    <button
                      type="button"
                      onClick={undoLastAction}
                      className="rounded-full bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onOpenSearch}
                  className="flex min-w-[210px] items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2.5 text-left text-sm text-slate-400 ring-1 ring-white/[0.055] hover:bg-white/[0.07] hover:text-white"
                >
                  <Command className="h-4 w-4 text-gold" />
                  <span className="flex-1 truncate">Command palette</span>
                  <kbd className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-white/[0.06]">Ctrl K</kbd>
                </button>

                <div className="flex items-center rounded-md bg-white/[0.025] p-1 ring-1 ring-white/[0.045]">
                  {(['triage', 'execution', 'executive'] as WorkspaceLayout[]).map((layout) => (
                    <button
                      key={layout}
                      onClick={() => setSessionValue('activeLayout', layout)}
                      className={cn(
                        'rounded px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                        session.activeLayout === layout ? 'bg-white/[0.09] text-white' : 'text-slate-500 hover:text-slate-200',
                      )}
                    >
                      {layout}
                    </button>
                  ))}
                </div>

                <EOXButton variant={session.mode === 'focus' ? 'primary' : 'quiet'} onClick={() => setSessionValue('mode', session.mode === 'focus' ? 'standard' : 'focus')}>
                  <PanelLeft className="h-4 w-4" />Focus
                </EOXButton>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                <span className="shrink-0 text-[11px] font-medium text-slate-600">Sessions</span>
                {session.openTabs.map((tab) => (
                  <button key={tab} className="shrink-0 rounded-md bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/[0.045] hover:bg-white/[0.065]">
                    {tab}
                  </button>
                ))}
                <button onClick={() => setSessionValue('openTabs', ['Live triage room', ...session.openTabs].slice(0, 6))} className="shrink-0 rounded-md bg-white/[0.03] px-3 py-2 text-xs text-slate-500 hover:bg-white/[0.06] hover:text-white">
                  +
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setSelectedQueueIndex((prev) => Math.max(prev - 1, 0))}
                  className="rounded-md bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-400 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white"
                >
                  Previous <kbd className="ml-1 text-[10px] text-slate-600">K</kbd>
                </button>
                <button
                  onClick={() => setSelectedQueueIndex((prev) => Math.min(prev + 1, operationalTasks.length - 1))}
                  className="rounded-md bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-400 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white"
                >
                  Next <kbd className="ml-1 text-[10px] text-slate-600">J</kbd>
                </button>
                <EOXButton
                  variant="primary"
                  disabled={statusByAction['quick-approve'] === 'loading'}
                  onClick={() => rapidAction('quick-approve', 'Approval')}
                >
                  {statusByAction['quick-approve'] === 'loading' ? 'Approving...' : 'Quick approve'}
                </EOXButton>
                <button
                  type="button"
                  onClick={() => executeAction('split-view-toggle', 'Split view', 'workspace-command-bar', {
                    run: () => setSession((prev) => ({ ...prev, splitView: !prev.splitView })),
                  })}
                  className={cn(
                    'rounded-md bg-white/[0.035] px-3 py-2 text-xs font-semibold ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white',
                    session.splitView ? 'text-white' : 'text-slate-500',
                  )}
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => executeAction('workspace-detach', 'Detach workspace', 'workspace-command-bar', {
                    run: () => {
                      setSession((prev) => ({ ...prev, panelStates: { ...prev.panelStates, workspace: { detached: !prev.panelStates.workspace?.detached } } }));
                      setOptimisticStatus(session.panelStates.workspace?.detached ? 'Workspace restored' : 'Workspace detached');
                    },
                  })}
                  className={cn(
                    'rounded-md bg-white/[0.035] px-3 py-2 text-xs font-semibold ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white',
                    session.panelStates.workspace?.detached ? 'text-gold' : 'text-slate-500',
                  )}
                >
                  Detach
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('grid h-[calc(100%-9rem)] gap-5 overflow-y-auto p-5', layoutColumns)}>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <EOXMetric label="Live Tasks" value="42" detail="8 moving now" tone="blue" />
              <EOXMetric label="SLA Risk" value="4" detail="Requires owner action" tone="red" />
              <EOXMetric label="Approvals" value="11" detail="5 quick-release ready" tone="gold" />
            </div>

            <WorkspacePanel
              title="Workflow Queue UX"
              meta="Keyboard traversal | SLA sorting | operational clustering"
              live
              density={session.density}
              actions={<VelocityBadge label="Pressure" value="High" tone="risk" />}
              className="bg-matte-black-light/85 ring-white/[0.07]"
              {...panelInteraction('workflow-queue')}
            >
              {renderTaskRows(session.density)}
            </WorkspacePanel>

            {session.mode !== 'focus' && (
              <WorkspacePanel title="Realtime Notice Panel" meta="Grouped notices and statutory deadlines" live density={session.density} {...panelInteraction('notice-panel')}>
                <div className="space-y-2">
                  {['GST DRC-01A response due today', 'Income tax query assigned', 'MCA filing clarification pending'].map((notice) => (
                    <div key={notice} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                      <p className="text-sm font-semibold text-white">{notice}</p>
                      <p className="mt-1 text-xs text-slate-500">Actionable alert | owner visible | comments enabled</p>
                    </div>
                  ))}
                </div>
              </WorkspacePanel>
            )}
          </div>

          <div className="space-y-5">
            <WorkspacePanel title="Split Workflow Surface" meta="Side-by-side execution workspace" live density={session.density} className="bg-matte-black-light/85 ring-white/[0.07]" {...panelInteraction('split-workflow')}>
              <div className="mb-3 flex flex-wrap gap-2">
                <VelocityBadge label="SLA" value={operationalTasks[selectedQueueIndex]?.sla || 'Live'} tone="risk" />
                <VelocityBadge label="Queue" value={`${selectedQueueIndex + 1}/${operationalTasks.length}`} tone="fast" />
                <VelocityBadge label="Click depth" value={String(velocityMemory.metrics.clickDepth)} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <div className="mb-2 flex items-center gap-2">
                    <SplitSquareHorizontal className="h-4 w-4 text-gold" />
                    <p className="text-sm font-semibold text-white">GST variance room</p>
                  </div>
                  <p className="text-xs text-slate-500">Risk overlay: high-value ITC mismatch. SLA indicator: 1h 42m.</p>
                  <div className="mt-3 flex gap-2">
                    <EOXButton variant="primary" disabled={statusByAction['assign-work'] === 'loading'} onClick={() => rapidAction('assign-work', 'Assignment')}>
                      {statusByAction['assign-work'] === 'loading' ? 'Assigning...' : 'Assign'}
                    </EOXButton>
                    <EOXButton disabled={statusByAction['bulk-resolve'] === 'loading'} onClick={() => rapidAction('bulk-resolve', 'Resolution')}>
                      {statusByAction['bulk-resolve'] === 'loading' ? 'Resolving...' : 'Resolve'}
                    </EOXButton>
                  </div>
                </div>
                <div className="rounded-md bg-white/[0.035] p-4 ring-1 ring-white/[0.045]">
                  <div className="mb-2 flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-gold" />
                    <p className="text-sm font-semibold text-white">Docked intelligence</p>
                  </div>
                  <p className="text-xs text-slate-500">Inline suggestion: request vendor confirmation before release. Confidence visible, action remains operator-owned.</p>
                  <div className="mt-3 flex gap-2">
                    <EOXButton onClick={() => rapidAction('open-ai-queue', 'AI queue')}>Open queue</EOXButton>
                    <EOXButton onClick={() => onNavigate('gst')}>GST context</EOXButton>
                  </div>
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Realtime Activity Layer" meta="Workflow, escalation, approval and telemetry feed" live density={session.density} {...panelInteraction('activity-layer')}>
              <TimelineList events={timelineEvents} />
            </WorkspacePanel>

            <WorkspacePanel title="AI Workflow Assist" meta="Next actions, continuation shortcuts, SLA-aware prompts" live density={session.density} {...panelInteraction('ai-workflow-assist')}>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'Continue GST variance', action: 'open-gst' as CommandAction },
                  { label: 'Assign next SLA risk', action: 'assign-work' as CommandAction },
                  { label: 'Approve clean batch', action: 'quick-approve' as CommandAction },
                  { label: 'Open AI queue', action: 'open-ai-queue' as CommandAction },
                ].map((item) => (
                  <button key={item.label} onClick={() => rapidAction(item.action, item.label)} className="rounded-md bg-white/[0.035] p-3 text-left ring-1 ring-white/[0.045] hover:bg-white/[0.065]">
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Operator-owned recommendation</p>
                  </button>
                ))}
              </div>
            </WorkspacePanel>
          </div>

          <aside className="space-y-4">
            <KnowledgeSnapshot onNavigate={onNavigate} />

            <GovernanceSnapshot onNavigate={onNavigate} />

            <CollaborationSnapshot onNavigate={onNavigate} onCommandAction={onCommandAction} />

            <WorkspacePanel title="Operational Inbox" meta="Action-ready live indicators" live density={session.density} {...panelInteraction('operational-inbox')}>
              <div className="space-y-2">
                {['4 SLA alerts', '3 escalation comments', '5 approval releases', '2 handoff mentions'].map((item, index) => (
                  <button key={item} className="flex w-full items-center justify-between rounded-md bg-white/[0.035] p-3 text-left ring-1 ring-white/[0.045] hover:bg-white/[0.065]">
                    <span className="text-xs font-semibold text-slate-300">{item}</span>
                    <span className={cn('h-2 w-2 rounded-full', index === 0 ? 'bg-red-400' : 'bg-emerald-400')} />
                  </button>
                ))}
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Collaboration" meta="Mentions, comments, handoffs" live density={session.density} {...panelInteraction('collaboration-panel')}>
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{comment.author}</p>
                      <span className="text-[10px] text-slate-600">{comment.time}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{comment.text}</p>
                  </div>
                ))}
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Persistent Context" meta="Pinned views and sessions" density={session.density} {...panelInteraction('persistent-context')}>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-medium tracking-normal text-slate-600">Pinned views</p>
                  <div className="space-y-1.5">
                    {[...session.pinnedViews, ...pins.map((pin) => pin.label)].slice(0, 5).map((item) => (
                      <button key={item} className="flex w-full items-center gap-2 rounded-md bg-white/[0.035] p-2.5 text-left text-xs text-slate-400 ring-1 ring-white/[0.045] hover:bg-white/[0.065]">
                        <Pin className="h-3.5 w-3.5 text-gold" />{item}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium tracking-normal text-slate-600">Recent sessions</p>
                  {[...session.recentSessions, ...recentNavigation].slice(0, 5).map((item) => (
                    <div key={item} className="py-1.5 text-xs text-slate-500">{item}</div>
                  ))}
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Action Memory" meta="Repeated-action shortcuts and productivity memory" density={session.density} {...panelInteraction('action-memory')}>
              <div className="space-y-2">
                {(velocityMemory.favoriteActions.length > 0 ? velocityMemory.favoriteActions : [
                  { action: 'assign-work', label: 'Assign owner', count: 4, lastUsedAt: '' },
                  { action: 'quick-approve', label: 'Quick approve', count: 3, lastUsedAt: '' },
                ]).slice(0, 4).map((item) => (
                  <button key={item.action} onClick={() => rapidAction(item.action as CommandAction, item.label)} className="flex w-full items-center justify-between rounded-md bg-white/[0.035] p-3 text-left ring-1 ring-white/[0.045] hover:bg-white/[0.065]">
                    <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                    <span className="text-[10px] text-gold">{item.count}x</span>
                  </button>
                ))}
                <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <p className="text-[11px] font-medium tracking-normal text-slate-600">Restored workflow</p>
                  <p className="mt-1 text-xs text-slate-300">{velocityMemory.lastWorkflow}</p>
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Rapid Actions" meta="Keyboard-first execution" density={session.density} {...panelInteraction('rapid-actions')}>
              <QuickActionCluster
                actions={[
                  { label: 'New task', onRun: () => rapidAction('create-task', 'Task') },
                  { label: 'Approve', onRun: () => rapidAction('quick-approve', 'Approval') },
                  { label: 'Escalate', onRun: () => rapidAction('assign-work', 'Escalation'), danger: true },
                  { label: 'Alerts', onRun: () => rapidAction('open-notification-center', 'Inbox') },
                ]}
              />
              <EOXButton className="mt-2 w-full" onClick={() => setSessionValue('density', session.density === 'compact' ? 'standard' : 'compact')}>
                <Rows3 className="h-4 w-4" />Density
              </EOXButton>
            </WorkspacePanel>

            <WorkspacePanel title="Interaction Analytics" meta="Friction, throughput and productivity scoring" density={session.density} {...panelInteraction('interaction-analytics')}>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <Gauge className="mb-1 h-4 w-4 text-gold" />
                  <p className="text-lg font-semibold text-white">{velocityMemory.metrics.frictionScore}</p>
                  <p className="text-[11px] font-medium tracking-normal text-slate-600">Productivity</p>
                </div>
                <div className="rounded-md bg-white/[0.035] p-3 ring-1 ring-white/[0.045]">
                  <CheckCircle2 className="mb-1 h-4 w-4 text-emerald-300" />
                  <p className="text-lg font-semibold text-white">{velocityMemory.metrics.queueThroughput}</p>
                  <p className="text-[11px] font-medium tracking-normal text-slate-600">Throughput</p>
                </div>
              </div>
            </WorkspacePanel>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RealtimeWorkspaceShell;
