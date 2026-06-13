import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FolderLock,
  ListChecks,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CommandAction } from '../services/commandPaletteService';

type ActionGroup = 'Execute' | 'Review' | 'Control';

type OperationalAction = {
  id: string;
  group: ActionGroup;
  title: string;
  detail: string;
  outcome: string;
  actionLabel: string;
  command: CommandAction;
  icon: React.FC<{ className?: string }>;
};

interface ContextualOperationsDrawerProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onCommandAction: (action: CommandAction) => void;
}

const actions: OperationalAction[] = [
  {
    id: 'tasks',
    group: 'Execute',
    title: 'Triage task queue',
    detail: 'Open the task board in an execution-first workflow.',
    outcome: 'Moves the operator to active work and SLA handling.',
    actionLabel: 'Open Tasks',
    command: 'open-tasks',
    icon: ListChecks,
  },
  {
    id: 'gst',
    group: 'Execute',
    title: 'Resolve GST work',
    detail: 'Open GST Intelligence for reconciliation and filing risk review.',
    outcome: 'Moves compliance risk into a domain workflow.',
    actionLabel: 'Open GST',
    command: 'open-gst',
    icon: ClipboardCheck,
  },
  {
    id: 'documents',
    group: 'Execute',
    title: 'Review document evidence',
    detail: 'Open the document vault for source files and governed document handling.',
    outcome: 'Supports evidence completion and client packet readiness.',
    actionLabel: 'Open Documents',
    command: 'open-documents',
    icon: FolderLock,
  },
  {
    id: 'clients',
    group: 'Review',
    title: 'Open client operations',
    detail: 'Review client records, assignments, and operational context.',
    outcome: 'Moves from signal to client-specific action.',
    actionLabel: 'Open Clients',
    command: 'open-clients',
    icon: Users,
  },
  {
    id: 'analytics',
    group: 'Review',
    title: 'Review operating trends',
    detail: 'Open analytics for executive review and workflow performance patterns.',
    outcome: 'Supports leadership review without adding dashboard clutter.',
    actionLabel: 'Open Analytics',
    command: 'open-analytics',
    icon: BarChart3,
  },
  {
    id: 'notices',
    group: 'Review',
    title: 'Review notice workload',
    detail: 'Open notice workflows for deadline and response tracking.',
    outcome: 'Moves deadline risk into the notice center.',
    actionLabel: 'Open Notices',
    command: 'open-notices',
    icon: FileSearch,
  },
  {
    id: 'approvals',
    group: 'Control',
    title: 'Clear approval blockers',
    detail: 'Open approval workflow controls for governed release decisions.',
    outcome: 'Unblocks work that requires review.',
    actionLabel: 'Open Approvals',
    command: 'open-approvals',
    icon: CheckCircle2,
  },
  {
    id: 'governance',
    group: 'Control',
    title: 'Review governance trail',
    detail: 'Open governance to inspect accountability, permissions, and auditability.',
    outcome: 'Supports enterprise trust and client audit readiness.',
    actionLabel: 'Open Governance',
    command: 'open-governance',
    icon: ShieldCheck,
  },
];

const filters: Array<ActionGroup | 'All'> = ['All', 'Execute', 'Review', 'Control'];

export const ContextualOperationsDrawer: React.FC<ContextualOperationsDrawerProps> = ({
  activeTab,
  isOpen,
  onClose,
  onOpenSearch,
  onCommandAction,
}) => {
  const [filter, setFilter] = useState<ActionGroup | 'All'>('All');
  const [actionState, setActionState] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const visibleActions = useMemo(
    () => actions.filter((action) => filter === 'All' || action.group === filter),
    [filter],
  );

  const executeAction = (action: OperationalAction) => {
    setActionState((prev) => ({ ...prev, [action.id]: 'loading' }));
    window.setTimeout(() => {
      try {
        onCommandAction(action.command);
        setActionState((prev) => ({ ...prev, [action.id]: 'success' }));
      } catch {
        setActionState((prev) => ({ ...prev, [action.id]: 'error' }));
      }
    }, 120);
  };

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-slate-800 bg-matte-black shadow-2xl transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Operations</p>
              <h2 className="mt-1 text-base font-semibold text-white">Workflow actions</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Action-backed shortcuts for the current workspace. Live alerts should only appear here after service wiring.
              </p>
            </div>
            <button
              type="button"
              title="Close operations drawer"
              aria-label="Close operations drawer"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-md border border-slate-800 bg-white/[0.025] p-3">
            <p className="text-[10px] uppercase text-slate-600">Current context</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{activeTab}</p>
          </div>
        </div>

        <div className="border-b border-slate-800 px-3 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  filter === item
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const status = actionState[action.id] ?? 'idle';
            return (
              <article key={action.id} className="rounded-md border border-slate-800 bg-white/[0.025] p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-slate-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{action.title}</p>
                      <span className="shrink-0 rounded-sm bg-slate-500/10 px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                        {action.group}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{action.detail}</p>
                    <p className="mt-2 text-[11px] leading-4 text-slate-400">{action.outcome}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={status === 'loading'}
                  onClick={() => executeAction(action)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-gold hover:text-matte-black disabled:cursor-wait disabled:opacity-60"
                >
                  {status === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {status === 'loading' ? 'Opening...' : action.actionLabel}
                </button>
                {status === 'error' && (
                  <p className="mt-2 text-xs text-red-300">Action failed. Use search to locate the workflow.</p>
                )}
              </article>
            );
          })}
        </div>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-gold/40 hover:text-white"
          >
            <Search className="h-3.5 w-3.5" />
            Search all workflows
          </button>
        </div>
      </div>
    </div>
  );
};
