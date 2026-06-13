import React from 'react';
import { Check, ChevronDown, Circle, Download, Filter, GripVertical, Keyboard, ListChecks, Maximize2, Minimize2, PanelRight, Save, Search, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export type DensityMode = 'compact' | 'standard' | 'executive';

export const densityScale: Record<DensityMode, { row: string; pad: string; text: string }> = {
  compact: { row: 'py-2.5', pad: 'p-3.5', text: 'text-xs' },
  standard: { row: 'py-3.5', pad: 'p-5', text: 'text-sm' },
  executive: { row: 'py-4', pad: 'p-6', text: 'text-base' },
};

export const eoxTokens = {
  typography: {
    pageTitle: 'text-xl font-semibold text-white tracking-normal leading-tight',
    sectionTitle: 'text-sm font-semibold text-white tracking-normal leading-snug',
    label: 'text-[11px] font-medium tracking-normal text-slate-500',
    body: 'text-sm leading-6 text-slate-300',
  },
  spacing: {
    shell: 'p-5 lg:p-7',
    section: 'space-y-5',
    stack: 'space-y-3',
  },
  card: 'rounded-md bg-matte-black-light/70 shadow-xl ring-1 ring-white/[0.045]',
  input: 'rounded-md bg-white/[0.035] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/[0.06] placeholder:text-slate-600 focus:ring-gold/45',
  button: 'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
};

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  density?: DensityMode;
}

export interface WorkspacePanelInteractionState {
  collapsed?: boolean;
  docked?: boolean;
  maximized?: boolean;
}

export const EOXCard: React.FC<SurfaceProps> = ({ children, className, density = 'standard' }) => (
  <section className={cn(eoxTokens.card, densityScale[density].pad, className)}>{children}</section>
);

export const EOXButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'danger' }> = ({
  className,
  variant = 'quiet',
  children,
  ...props
}) => (
  <button
    {...props}
    className={cn(
      eoxTokens.button,
      variant === 'primary' && 'bg-gold text-matte-black shadow-sm shadow-gold/10 hover:bg-gold-light',
      variant === 'quiet' && 'bg-white/[0.035] text-slate-300 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white',
      variant === 'danger' && 'bg-red-500/10 text-red-300 ring-1 ring-red-400/15 hover:bg-red-500/15',
      className,
    )}
  >
    {children}
  </button>
);

export const EOXMetric: React.FC<{ label: string; value: string; detail: string; tone?: 'gold' | 'green' | 'red' | 'blue' }> = ({
  label,
  value,
  detail,
  tone = 'gold',
}) => {
  const tones = {
    gold: 'text-gold',
    green: 'text-emerald-300',
    red: 'text-red-300',
    blue: 'text-sky-300',
  };
  return (
    <div className="rounded-md bg-white/[0.035] p-4 shadow-sm ring-1 ring-white/[0.045]">
      <p className={eoxTokens.typography.label}>{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tracking-normal', tones[tone])}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
};

export interface EOXTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

export function EOXDataTable<T extends { id: string }>({
  title,
  rows,
  columns,
  selected,
  onSelectedChange,
  density = 'standard',
}: {
  title: string;
  rows: T[];
  columns: EOXTableColumn<T>[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  density?: DensityMode;
}) {
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => onSelectedChange(allSelected ? [] : rows.map((row) => row.id));
  const toggleOne = (id: string) => {
    onSelectedChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  return (
    <EOXCard density={density} className="overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className={eoxTokens.typography.label}>Advanced Table</p>
          <h3 className={eoxTokens.typography.sectionTitle}>{title}</h3>
        </div>
        <EOXButton><Filter className="h-4 w-4" />Filters</EOXButton>
        <EOXButton><ChevronDown className="h-4 w-4" />Saved views</EOXButton>
        <EOXButton><Download className="h-4 w-4" />Export</EOXButton>
        <EOXButton><Save className="h-4 w-4" />Save</EOXButton>
      </div>
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-gold/10 p-2.5 text-xs text-gold ring-1 ring-gold/15">
          <ListChecks className="h-4 w-4" />
          <span className="font-bold">{selected.length} selected</span>
          <EOXButton variant="primary" className="py-1"><Check className="h-4 w-4" />Quick approve</EOXButton>
          <EOXButton className="py-1"><GripVertical className="h-4 w-4" />Mass assign</EOXButton>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-800 text-[11px] font-medium tracking-normal text-slate-500">
              <th className="w-10 px-2 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-gold" />
              </th>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-2 py-2 font-medium">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-800/60 hover:bg-white/[0.035]">
                <td className="px-2">
                  <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)} className="accent-gold" />
                </td>
                {columns.map((column) => (
                  <td key={String(column.key)} className={cn('px-2 text-slate-300', densityScale[density].row, densityScale[density].text)}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EOXCard>
  );
}

export const CommandPalettePreview: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <button
    onClick={onOpen}
    className="flex w-full items-center gap-3 rounded-md bg-white/[0.035] px-3 py-2.5 text-left text-sm text-slate-400 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white"
  >
    <Search className="h-4 w-4 text-gold" />
    <span className="flex-1">Search clients, GSTIN, tasks, notices, workflows...</span>
    <kbd className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-white/[0.06]">Ctrl K</kbd>
  </button>
);

export const WorkspacePanel: React.FC<SurfaceProps & {
  title: string;
  meta?: string;
  live?: boolean;
  actions?: React.ReactNode;
  interactionState?: WorkspacePanelInteractionState;
  onInteractionChange?: (next: WorkspacePanelInteractionState, action: 'collapse' | 'dock' | 'maximize') => void;
}> = ({
  title,
  meta,
  live,
  actions,
  children,
  className,
  interactionState,
  onInteractionChange,
  density = 'standard',
}) => {
  const [localState, setLocalState] = React.useState<WorkspacePanelInteractionState>({});
  const state = interactionState || localState;
  const setNextState = (next: WorkspacePanelInteractionState, action: 'collapse' | 'dock' | 'maximize') => {
    if (onInteractionChange) {
      onInteractionChange(next, action);
    } else {
      setLocalState(next);
    }
  };

  const toggleCollapse = () => setNextState({ ...state, collapsed: !state.collapsed }, 'collapse');
  const toggleDock = () => setNextState({ ...state, docked: !state.docked }, 'dock');
  const toggleMaximize = () => setNextState({ ...state, maximized: !state.maximized, collapsed: false }, 'maximize');

  return (
    <section
      className={cn(
        'min-h-0 rounded-md bg-matte-black-light/70 shadow-xl ring-1 ring-white/[0.045]',
        state.docked && 'opacity-85',
        state.maximized && 'fixed inset-4 z-50 flex flex-col bg-matte-black-light shadow-2xl ring-gold/20',
        className,
      )}
      aria-expanded={!state.collapsed}
    >
      <div className="flex min-h-12 items-center gap-2 px-4 pt-3">
        {live && <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          {meta && <p className="truncate text-[11px] font-medium tracking-normal text-slate-600">{meta}</p>}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={toggleCollapse}
            className="rounded bg-white/[0.035] p-1.5 text-slate-500 hover:bg-white/[0.07] hover:text-white"
            title={state.collapsed ? 'Expand panel content' : 'Collapse panel content'}
            aria-label={state.collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', state.collapsed && '-rotate-90')} />
          </button>
          <button
            type="button"
            onClick={toggleDock}
            className={cn('rounded bg-white/[0.035] p-1.5 text-slate-500 hover:bg-white/[0.07] hover:text-white', state.docked && 'text-gold')}
            title={state.docked ? 'Restore panel from dock' : 'Dock panel'}
            aria-label={state.docked ? `Restore ${title} from dock` : `Dock ${title}`}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleMaximize}
            className={cn('rounded bg-white/[0.035] p-1.5 text-slate-500 hover:bg-white/[0.07] hover:text-white', state.maximized && 'text-gold')}
            title={state.maximized ? 'Restore panel size' : 'Maximize panel'}
            aria-label={state.maximized ? `Restore ${title}` : `Maximize ${title}`}
          >
            {state.maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {!state.collapsed && <div className={cn('min-h-0 overflow-auto', state.maximized && 'flex-1', densityScale[density].pad)}>{children}</div>}
    </section>
  );
};

export const DockRail: React.FC<{ items: Array<{ id: string; label: string; icon: React.FC<{ className?: string }>; active?: boolean; count?: number }>; onSelect: (id: string) => void }> = ({
  items,
  onSelect,
}) => (
  <div className="flex h-full w-16 flex-col items-center gap-2 bg-matte-black-light/55 p-2 shadow-xl ring-1 ring-white/[0.04]">
    {items.map((item) => (
      <button
        key={item.id}
        onClick={() => onSelect(item.id)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
          item.active ? 'bg-white/[0.07] text-gold ring-1 ring-gold/20' : 'text-slate-500 hover:bg-white/[0.055] hover:text-white',
        )}
        title={item.label}
      >
        <item.icon className="h-4 w-4" />
        {item.count !== undefined && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded bg-red-500/90 px-1 text-[9px] font-semibold text-white shadow-sm">
            {item.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const ActivityIndicator: React.FC<{ label: string; tone?: 'live' | 'risk' | 'idle' }> = ({ label, tone = 'live' }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-normal',
      tone === 'live' && 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15',
      tone === 'risk' && 'bg-red-500/10 text-red-300 ring-1 ring-red-400/15',
      tone === 'idle' && 'bg-white/[0.035] text-slate-500 ring-1 ring-white/[0.045]',
    )}
  >
    <Circle className={cn('h-2 w-2', tone === 'live' && 'fill-emerald-400', tone === 'risk' && 'fill-red-400', tone === 'idle' && 'fill-slate-600')} />
    {label}
  </span>
);

export const TimelineList: React.FC<{ events: Array<{ id: string; title: string; detail: string; time: string; tone?: 'gold' | 'red' | 'green' | 'blue' }> }> = ({ events }) => (
  <div className="space-y-3">
    {events.map((event) => (
      <div key={event.id} className="grid grid-cols-[14px_minmax(0,1fr)] gap-3">
        <div className="flex flex-col items-center">
          <span className={cn('mt-1 h-2.5 w-2.5 border', event.tone === 'red' ? 'border-red-300 bg-red-400' : event.tone === 'green' ? 'border-emerald-300 bg-emerald-400' : event.tone === 'blue' ? 'border-sky-300 bg-sky-400' : 'border-gold bg-gold')} />
          <span className="mt-1 h-full w-px bg-slate-800" />
        </div>
        <div className="min-w-0 pb-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-white">{event.title}</p>
            <span className="shrink-0 text-[10px] text-slate-600">{event.time}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{event.detail}</p>
        </div>
      </div>
    ))}
  </div>
);

export const VelocityBadge: React.FC<{ label: string; value: string; tone?: 'fast' | 'risk' | 'neutral' }> = ({ label, value, tone = 'neutral' }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-normal',
      tone === 'fast' && 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15',
      tone === 'risk' && 'bg-red-500/10 text-red-300 ring-1 ring-red-400/15',
      tone === 'neutral' && 'bg-white/[0.035] text-slate-400 ring-1 ring-white/[0.045]',
    )}
  >
    <Zap className="h-3 w-3" />
    {label}: {value}
  </span>
);

export const CommandStrip: React.FC<{ commands: Array<{ label: string; shortcut: string; onRun: () => void; primary?: boolean }> }> = ({ commands }) => (
  <div className="flex gap-2 overflow-x-auto bg-matte-black/70 px-4 py-3">
    {commands.map((command) => (
      <button
        key={`${command.label}-${command.shortcut}`}
        onClick={command.onRun}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
          command.primary ? 'bg-gold text-matte-black shadow-sm shadow-gold/10 hover:bg-gold-light' : 'bg-white/[0.035] text-slate-300 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white',
        )}
      >
        <Keyboard className="h-4 w-4" />
        <span>{command.label}</span>
        <kbd className={cn('rounded px-1.5 py-0.5 text-[10px]', command.primary ? 'bg-matte-black/10' : 'bg-white/[0.04] text-slate-500 ring-1 ring-white/[0.06]')}>{command.shortcut}</kbd>
      </button>
    ))}
  </div>
);

export const QuickActionCluster: React.FC<{ actions: Array<{ label: string; onRun: () => void; danger?: boolean }> }> = ({ actions }) => (
  <div className="grid grid-cols-2 gap-2">
    {actions.map((action) => (
      <button
        key={action.label}
        onClick={action.onRun}
        className={cn(
          'rounded-md px-2 py-2.5 text-xs font-semibold transition-colors',
          action.danger ? 'bg-red-500/10 text-red-300 ring-1 ring-red-400/15 hover:bg-red-500/15' : 'bg-white/[0.035] text-slate-300 ring-1 ring-white/[0.045] hover:bg-white/[0.065] hover:text-white',
        )}
      >
        {action.label}
      </button>
    ))}
  </div>
);

export const VelocityQueueRow: React.FC<{
  title: string;
  meta: string;
  sla: string;
  selected?: boolean;
  pressure?: 'low' | 'medium' | 'high';
  onOpen: () => void;
}> = ({ title, meta, sla, selected, pressure = 'low', onOpen }) => (
  <button
    onClick={onOpen}
    className={cn(
      'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md p-3 text-left transition-colors',
      selected ? 'bg-gold/10 ring-1 ring-gold/20' : 'bg-white/[0.035] ring-1 ring-white/[0.045] hover:bg-white/[0.065]',
    )}
  >
    <span className="min-w-0">
      <span className="block truncate text-sm font-bold text-white">{title}</span>
      <span className="mt-1 block truncate text-xs text-slate-500">{meta}</span>
    </span>
    <span className={cn('self-center text-xs font-bold', pressure === 'high' ? 'text-red-300' : pressure === 'medium' ? 'text-gold' : 'text-emerald-300')}>{sla}</span>
  </button>
);
