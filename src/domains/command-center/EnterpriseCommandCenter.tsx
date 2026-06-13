import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Command,
  ExternalLink,
  FileCheck2,
  Filter,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Pin,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { CommandAction, getRoleAwareCommands } from '../../services/commandPaletteService';
import { QuickAccessPin } from '../../services/workspacePreferencesService';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import {
  CommandPalettePreview,
  DensityMode,
  EOXButton,
  EOXCard,
  EOXDataTable,
  EOXMetric,
  eoxTokens,
} from '../../design-system';

interface EnterpriseCommandCenterProps {
  user: User;
  pins: QuickAccessPin[];
  recentNavigation: string[];
  onNavigate: (tab: string) => void;
  onOpenSearch: () => void;
  onCommandAction: (action: CommandAction) => void;
}

type WorkItem = {
  id: string;
  client: string;
  work: string;
  owner: string;
  priority: string;
  sla: string;
  status: string;
};

const workQueue: WorkItem[] = [
  { id: 'wq-1', client: 'Aarav Exports', work: 'GSTR-3B variance review', owner: 'Meera', priority: 'Urgent', sla: '2h', status: 'Review' },
  { id: 'wq-2', client: 'Nexus Foods', work: 'Notice response draft', owner: 'Rohan', priority: 'High', sla: 'Today', status: 'Drafted' },
  { id: 'wq-3', client: 'Helio Textiles', work: 'Document approval', owner: 'Anika', priority: 'Medium', sla: '1d', status: 'Approval' },
  { id: 'wq-4', client: 'Prism Advisors', work: 'Client onboarding closure', owner: 'Kunal', priority: 'High', sla: '4h', status: 'Pending' },
];

const activity = [
  { id: 'a1', type: 'Workflow', text: 'GST reconciliation moved to admin review', time: '8m ago', icon: Workflow },
  { id: 'a2', type: 'Escalation', text: 'SLA breach risk raised for Nexus Foods notice', time: '17m ago', icon: ShieldAlert },
  { id: 'a3', type: 'Approval', text: 'Three documents cleared for client visibility', time: '31m ago', icon: FileCheck2 },
  { id: 'a4', type: 'Intelligence', text: 'High-value client workload cluster detected', time: '45m ago', icon: BrainCircuit },
];

const notifications = [
  { id: 'n1', group: 'SLA', title: '2 urgent workflows need action', score: 94, action: 'Open queue' },
  { id: 'n2', group: 'Approvals', title: '5 approvals waiting for release', score: 82, action: 'Quick approve' },
  { id: 'n3', group: 'Notices', title: 'GST notice deadline due today', score: 89, action: 'Assign owner' },
];

const workspaceTabs = [
  { id: 'tasks', label: 'My Tasks', icon: ListChecks },
  { id: 'notices', label: 'My Notices', icon: Bell },
  { id: 'clients', label: 'My Clients', icon: Users },
  { id: 'approvals', label: 'My Approvals', icon: FileCheck2 },
  { id: 'notifications', label: 'My Alerts', icon: AlertTriangle },
  { id: 'ai', label: 'My Intelligence', icon: BrainCircuit },
];

export const EnterpriseCommandCenter: React.FC<EnterpriseCommandCenterProps> = ({
  user,
  pins,
  recentNavigation,
  onNavigate,
  onOpenSearch,
  onCommandAction,
}) => {
  const [density, setDensity] = useState<DensityMode>('standard');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const commands = useMemo(() => getRoleAwareCommands(user.role).slice(0, 8), [user.role]);
  const priorityInbox = workQueue.filter((item) => item.priority === 'Urgent' || item.priority === 'High');

  return (
    <div className="h-full overflow-y-auto bg-matte-black text-white">
      <div className={cn(eoxTokens.spacing.shell, 'space-y-4')}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={eoxTokens.typography.label}>Enterprise Operational Experience</p>
            <h1 className={eoxTokens.typography.pageTitle}>Command Center</h1>
          </div>
          <div className="flex border border-slate-800 bg-matte-black-light p-1">
            {(['compact', 'standard', 'executive'] as DensityMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDensity(mode)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold capitalize transition-colors',
                  density === mode ? 'bg-gold text-matte-black' : 'text-slate-400 hover:text-white',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <CommandPalettePreview onOpen={onOpenSearch} />

        <div className="grid gap-3 lg:grid-cols-5">
          <EOXMetric label="SLA Health" value="91%" detail="4 lanes require intervention" tone="green" />
          <EOXMetric label="Priority Inbox" value={String(priorityInbox.length)} detail="Urgent and high items" tone="gold" />
          <EOXMetric label="Approvals" value="5" detail="Ready for quick release" tone="blue" />
          <EOXMetric label="Escalations" value="3" detail="Owner action pending" tone="red" />
          <EOXMetric label="Workload" value="72%" detail="Balanced across staff" tone="green" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <EOXCard density={density}>
                <div className="mb-3 flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-gold" />
                  <h2 className={eoxTokens.typography.sectionTitle}>Personal Work Queue</h2>
                </div>
                <div className="space-y-2">
                  {priorityInbox.map((item) => (
                    <button key={item.id} onClick={() => onNavigate('tasks')} className="w-full border border-slate-800 bg-matte-black p-3 text-left hover:border-gold/40">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-bold text-white">{item.work}</p>
                        <span className="text-xs font-bold text-gold">{item.sla}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.client} | {item.owner} | {item.status}</p>
                    </button>
                  ))}
                </div>
              </EOXCard>

              <EOXCard density={density}>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <h2 className={eoxTokens.typography.sectionTitle}>AI Recommendations Feed</h2>
                </div>
                <div className="space-y-2">
                  {commands.slice(0, 4).map((command) => (
                    <button key={command.id} onClick={() => onCommandAction(command.id)} className="w-full border border-slate-800 bg-matte-black p-3 text-left hover:border-gold/40">
                      <p className="text-sm font-bold text-white">{command.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{command.subtitle}</p>
                    </button>
                  ))}
                </div>
              </EOXCard>
            </div>

            <EOXDataTable
              title="Workflow Acceleration Queue"
              rows={workQueue}
              selected={selectedRows}
              onSelectedChange={setSelectedRows}
              density={density}
              columns={[
                { key: 'client', label: 'Client' },
                { key: 'work', label: 'Work item' },
                { key: 'owner', label: 'Owner' },
                {
                  key: 'priority',
                  label: 'Priority',
                  render: (row) => <span className={cn('font-bold', row.priority === 'Urgent' ? 'text-red-300' : 'text-gold')}>{row.priority}</span>,
                },
                { key: 'sla', label: 'SLA' },
                { key: 'status', label: 'Status' },
              ]}
            />

            <EOXCard density={density}>
              <div className="mb-3 flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-gold" />
                <h2 className={eoxTokens.typography.sectionTitle}>Operator Workspace</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {workspaceTabs.map((item) => (
                  <button key={item.id} onClick={() => onNavigate(item.id)} className="flex items-center gap-3 border border-slate-800 bg-matte-black p-3 text-left hover:border-gold/40">
                    <item.icon className="h-4 w-4 text-gold" />
                    <span className="text-sm font-bold text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </EOXCard>
          </div>

          <aside className="space-y-4">
            <EOXCard density={density}>
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold" />
                <h2 className={eoxTokens.typography.sectionTitle}>Operational Shortcuts</h2>
              </div>
              <div className="grid gap-2">
                <EOXButton variant="primary" onClick={() => onCommandAction('create-task')}><Command className="h-4 w-4" />New task</EOXButton>
                <EOXButton onClick={() => onCommandAction('assign-work')}><UserCheck className="h-4 w-4" />Mass assign</EOXButton>
                <EOXButton onClick={() => onCommandAction('open-approvals')}><CheckCircle2 className="h-4 w-4" />Quick approvals</EOXButton>
                <EOXButton onClick={onOpenSearch}><Search className="h-4 w-4" />Universal search</EOXButton>
              </div>
            </EOXCard>

            <EOXCard density={density}>
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-gold" />
                <h2 className={eoxTokens.typography.sectionTitle}>Notification Center</h2>
              </div>
              <div className="mb-2 flex gap-2">
                <EOXButton className="py-1"><Filter className="h-4 w-4" />Priority</EOXButton>
                <EOXButton className="py-1">Grouped</EOXButton>
              </div>
              <div className="space-y-2">
                {notifications.map((item) => (
                  <div key={item.id} className="border border-slate-800 bg-matte-black p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase text-gold">{item.group}</p>
                      <span className="text-xs font-bold text-slate-500">{item.score}</span>
                    </div>
                    <p className="mt-1 text-sm text-white">{item.title}</p>
                    <button className="mt-2 text-xs font-bold text-sky-300 hover:text-sky-200">{item.action}</button>
                  </div>
                ))}
              </div>
            </EOXCard>

            <EOXCard density={density}>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" />
                <h2 className={eoxTokens.typography.sectionTitle}>Activity Stream</h2>
              </div>
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
                    <item.icon className="mt-0.5 h-4 w-4 text-gold" />
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">{item.type} | {item.time}</p>
                      <p className="text-sm text-slate-300">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </EOXCard>

            <EOXCard density={density}>
              <div className="mb-3 flex items-center gap-2">
                <Pin className="h-4 w-4 text-gold" />
                <h2 className={eoxTokens.typography.sectionTitle}>Navigation Fabric</h2>
              </div>
              <div className="space-y-2">
                {pins.slice(0, 5).map((pin) => (
                  <button key={pin.id} onClick={() => onNavigate(pin.target)} className="flex w-full items-center justify-between gap-2 border border-slate-800 bg-matte-black p-2 text-left hover:border-gold/40">
                    <span className="truncate text-xs font-bold text-slate-300">{pin.label}</span>
                    <ExternalLink className="h-3 w-3 text-slate-500" />
                  </button>
                ))}
                {recentNavigation.slice(0, 4).map((item) => (
                  <div key={item} className="border border-slate-800 bg-matte-black p-2 text-xs text-slate-500">{item}</div>
                ))}
              </div>
            </EOXCard>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseCommandCenter;

