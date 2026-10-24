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
import { getLiveWorkspaceSnapshot, LiveWorkspaceSnapshot } from '../../services/liveWorkspaceDataService';
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
  const [operationalTasks, setOperationalTasks] = useState(() => user.role === 'SuperAdmin' ? [] : initialLiveTasks);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveWorkspaceSnapshot | null>(null);
  const [velocityMemory, setVelocityMemory] = useState(() => loadVelocityMemory(user.id));
  const { executeAction, lastResult, statusByAction, undoLastAction } = useOperationalActionExecutor(user.id, user.role);

  useEffect(() => {
    saveWorkspaceSession(user.id, session);
  }, [session, user.id]);

  useEffect(() => {
    saveVelocityMemory(user.id, velocityMemory);
  }, [user.id, velocityMemory]);

  useEffect(() => {
    if (user.role !== 'SuperAdmin' || !user.firmId) return;
    let active = true;
    getLiveWorkspaceSnapshot(user.firmId)
      .then((snapshot) => {
        if (!active) return;
        setLiveSnapshot(snapshot);
        setOperationalTasks(snapshot.tasks);
      })
      .catch(() => {
        if (active) setOptimisticStatus('Live data reconnecting');
      });
    return () => { active = false; };
  }, [user.firmId, user.role]);

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

  if (user.role === 'SuperAdmin') {
    const selectedTask = operationalTasks[selectedQueueIndex] ?? operationalTasks[0];
    const urgentTaskCount = liveSnapshot?.summary.urgentTasks ?? operationalTasks.filter((task) => task.risk === 'High').length;
    const liveTimelineEvents = operationalTasks.slice(0, 4).map((task, index) => ({
      id: `live-${task.id}`,
      title: index === 0 ? 'Priority work ready' : 'Open work item',
      detail: `${task.title} · ${task.client} · ${task.status}`,
      time: task.sla,
      tone: task.risk === 'High' ? 'red' as const : task.risk === 'Medium' ? 'gold' as const : 'green' as const,
    }));

    return (
      <div className="h-full overflow-y-auto bg-matte-black text-white">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-matte-black/95 px-6 py-5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-white">Practice command centre</h1>
                <ActivityIndicator label={optimisticStatus} tone="live" />
              </div>
              <p className="mt-1 text-sm text-slate-500">Your priorities, approvals and team activity in one focused view.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex items-center gap-2 rounded-md bg-white/[0.035] px-3.5 py-2 text-sm text-slate-400 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <Command className="h-4 w-4 text-gold" />
                Search
                <kbd className="ml-1 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500">Ctrl K</kbd>
              </button>
              <EOXButton variant="primary" onClick={() => onNavigate('tasks')}>
                New task
              </EOXButton>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] space-y-5 p-6">
          {lastResult ? (
            <div className={cn(
              'flex items-center justify-between gap-3 rounded-md px-4 py-3 text-sm ring-1',
              lastResult.status === 'success' && 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20',
              lastResult.status === 'failure' && 'bg-red-500/10 text-red-200 ring-red-400/20',
              lastResult.status === 'permission-denied' && 'bg-amber-500/10 text-amber-200 ring-amber-400/20',
              lastResult.status === 'disabled' && 'bg-white/[0.035] text-slate-400 ring-white/[0.06]',
            )}>
              <span>{lastResult.message}</span>
              {lastResult.undo ? (
                <button type="button" onClick={undoLastAction} className="font-semibold text-white hover:text-gold">Undo</button>
              ) : null}
            </div>
          ) : null}

          <section aria-label="Today's practice summary" className="grid gap-3 md:grid-cols-3">
            <EOXMetric label="Work requiring attention" value={liveSnapshot ? String(liveSnapshot.summary.openTasks) : '—'} detail={`${urgentTaskCount} urgent today`} tone="blue" />
            <EOXMetric label="SLA risks" value={liveSnapshot ? String(liveSnapshot.summary.slaRisks) : '—'} detail="Owner action required" tone="red" />
            <EOXMetric label="Pending approvals" value={liveSnapshot ? String(liveSnapshot.summary.pendingApprovals) : '—'} detail="Awaiting review" tone="gold" />
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <section className="rounded-lg bg-matte-black-light/80 p-5 ring-1 ring-white/[0.07]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <h2 className="font-semibold text-white">Priority work queue</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Select an item to review and act.</p>
                  </div>
                  <VelocityBadge label="Urgent" value={String(urgentTaskCount)} tone="risk" />
                </div>
                {operationalTasks.length > 0 ? renderTaskRows('standard') : (
                  <div className="rounded-md bg-white/[0.025] p-6 text-center text-sm text-slate-500 ring-1 ring-white/[0.05]">
                    {liveSnapshot ? 'No open tasks require attention.' : 'Loading live work queue…'}
                  </div>
                )}
              </section>

              {selectedTask ? (
                <section className="rounded-lg bg-matte-black-light/80 p-5 ring-1 ring-white/[0.07]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Selected work</p>
                      <h2 className="mt-2 text-lg font-semibold text-white">{selectedTask.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{selectedTask.client} · {selectedTask.owner} · {selectedTask.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <VelocityBadge label="SLA" value={selectedTask.sla} tone={selectedTask.risk === 'High' ? 'risk' : 'fast'} />
                      <VelocityBadge label="Risk" value={selectedTask.risk} tone={selectedTask.risk === 'High' ? 'risk' : 'fast'} />
                    </div>
                  </div>

                  <div className="mt-5 rounded-md bg-white/[0.025] p-4 ring-1 ring-white/[0.05]">
                    <div className="flex items-start gap-3">
                      <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <div>
                        <p className="text-sm font-semibold text-white">Recommended next step</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">Review the supporting records, confirm ownership and resolve the exception before its SLA expires.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <EOXButton variant="primary" onClick={() => onNavigate('tasks')}>Assign owner</EOXButton>
                    <EOXButton onClick={() => onNavigate('tasks')}>Review status</EOXButton>
                    <EOXButton onClick={() => onNavigate('gst')}>Open GST details</EOXButton>
                  </div>
                </section>
              ) : null}

              <section className="rounded-lg bg-matte-black-light/80 p-5 ring-1 ring-white/[0.07]">
                <h2 className="font-semibold text-white">Recent practice activity</h2>
                <p className="mb-4 mt-1 text-xs text-slate-500">Current work signals across your practice.</p>
                {liveTimelineEvents.length > 0 ? (
                  <TimelineList events={liveTimelineEvents} />
                ) : (
                  <div className="rounded-md bg-white/[0.025] p-5 text-sm text-slate-500 ring-1 ring-white/[0.05]">
                    {liveSnapshot ? 'No recent open-work activity requires attention.' : 'Loading live activity…'}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-lg bg-matte-black-light/80 p-5 ring-1 ring-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gold" />
                  <h2 className="font-semibold text-white">Today’s actions</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">Common actions kept within one click.</p>
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => onNavigate('approvals')} className="flex w-full items-center justify-between rounded-md bg-gold px-3.5 py-3 text-left text-sm font-semibold text-matte-black transition-colors hover:bg-gold-light">
                    Approve selected item
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => rapidAction('open-notification-center', 'Inbox')} className="flex w-full items-center justify-between rounded-md bg-white/[0.035] px-3.5 py-3 text-left text-sm font-semibold text-slate-300 ring-1 ring-white/[0.05] hover:bg-white/[0.07]">
                    Review alerts
                    <Bell className="h-4 w-4 text-red-300" />
                  </button>
                  <button type="button" onClick={() => onNavigate('approvals')} className="flex w-full items-center justify-between rounded-md bg-white/[0.035] px-3.5 py-3 text-left text-sm font-semibold text-slate-300 ring-1 ring-white/[0.05] hover:bg-white/[0.07]">
                    Open all approvals
                    <Workflow className="h-4 w-4 text-gold" />
                  </button>
                </div>
              </section>

              <section className="rounded-lg bg-matte-black-light/80 p-5 ring-1 ring-white/[0.07]">
                <h2 className="font-semibold text-white">Practice pulse</h2>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Active team', value: liveSnapshot ? String(liveSnapshot.summary.activeTeam) : '—', tone: 'text-emerald-300' },
                    { label: 'Urgent work', value: liveSnapshot ? String(liveSnapshot.summary.urgentTasks) : '—', tone: 'text-gold' },
                    { label: 'Governance trust', value: liveSnapshot ? String(liveSnapshot.summary.governanceTrust) : '—', tone: 'text-emerald-300' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <span className={cn('text-lg font-semibold', item.tone)}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg bg-matte-black-light/80 p-5 ring-1 ring-white/[0.07]">
                <h2 className="font-semibold text-white">Quick navigation</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Tasks', target: 'tasks' },
                    { label: 'Clients', target: 'clients' },
                    { label: 'Documents', target: 'documents' },
                    { label: 'GST', target: 'gst' },
                    { label: 'Notices', target: 'notices' },
                    { label: 'QA review', target: 'qa' },
                  ].map((item) => (
                    <button key={item.target} type="button" onClick={() => onNavigate(item.target)} className="rounded-md bg-white/[0.035] px-3 py-2.5 text-left text-xs font-semibold text-slate-400 ring-1 ring-white/[0.05] hover:bg-white/[0.07] hover:text-white">
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-dashed border-white/[0.08] p-4 text-xs leading-5 text-slate-500">
                <span className="font-semibold text-slate-300">Workspace context:</span> {session.openTabs[selectedQueueIndex % Math.max(session.openTabs.length, 1)] ?? 'Live practice overview'}
              </section>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full overflow-hidden bg-matte-black text-white', session.panelStates.workspace?.detached && 'm-3 h-[calc(100%-1.5rem)] rounded-md shadow-2xl ring-1 ring-gold/20')}>
      <div className="hidden md:block">
        <DockRail
          items={dockItems.map((item) => ({ ...item, active: session.activePanel === item.id }))}
          onSelect={(id) => setSessionValue('activePanel', id as WorkspacePanelId)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 bg-matte-black/82 px-3 py-3 shadow-sm ring-1 ring-white/[0.04] backdrop-blur sm:px-5 sm:py-4">
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

              <div className="flex w-full items-center gap-2 overflow-x-auto lg:w-auto">
                <button
                  onClick={onOpenSearch}
                  className="flex min-w-[180px] items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2.5 text-left text-sm text-slate-400 ring-1 ring-white/[0.055] hover:bg-white/[0.07] hover:text-white sm:min-w-[210px]"
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

              <div className="flex w-full items-center gap-2 overflow-x-auto sm:w-auto sm:shrink-0">
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

        <div className={cn('grid min-h-0 flex-1 gap-4 overflow-y-auto p-3 sm:gap-5 sm:p-5', layoutColumns)}>
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
                    <p className="text-sm font-semibold text-white">Suggested next step</p>
                  </div>
                  <p className="text-xs text-slate-500">Review the task details and request vendor confirmation before release.</p>
                  <div className="mt-3 flex gap-2">
                    <EOXButton onClick={() => rapidAction('open-tasks', 'Task board')}>Open tasks</EOXButton>
                    <EOXButton onClick={() => onNavigate('gst')}>GST context</EOXButton>
                  </div>
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Realtime Activity Layer" meta="Workflow, escalation, approval and telemetry feed" live density={session.density} {...panelInteraction('activity-layer')}>
              <TimelineList events={timelineEvents} />
            </WorkspacePanel>

            <WorkspacePanel title="Quick Actions" meta="Common task and compliance shortcuts" density={session.density} {...panelInteraction('ai-workflow-assist')}>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'Continue GST variance', action: 'open-gst' as CommandAction },
                  { label: 'Assign next SLA risk', action: 'assign-work' as CommandAction },
                  { label: 'Approve clean batch', action: 'quick-approve' as CommandAction },
                  { label: 'Open task board', action: 'open-tasks' as CommandAction },
                ].map((item) => (
                  <button key={item.label} onClick={() => rapidAction(item.action, item.label)} className="rounded-md bg-white/[0.035] p-3 text-left ring-1 ring-white/[0.045] hover:bg-white/[0.065]">
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Open the relevant workspace</p>
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
