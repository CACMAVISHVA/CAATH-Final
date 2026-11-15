import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertOctagon, AlertTriangle, BellRing, Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, ShieldAlert, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import type { ErrorSeverity, ErrorType } from '../../services/errorReporter';
import {
  ERROR_SEVERITIES, ERROR_STATUSES, ERROR_TYPES, ERROR_TYPE_LABELS, ErrorAlert, ErrorAlertSettings, ErrorFilters, ErrorGroupDetail, ErrorGroupRow,
  ErrorStats, ErrorStatus, HealthProbe, errorReference, getAlertHistory, getAlertSettings, getErrorGroupDetail, getErrorStats, isMonitoringUnavailable,
  listErrorGroups, runHealthProbes, saveAlertSettings, updateErrorGroup,
} from '../../services/errorMonitoringService';

const PAGE_SIZE = 20;
const number = (value: number | null | undefined) => Number(value ?? 0).toLocaleString('en-IN');
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shortDay = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const isoDay = (offsetDays: number) => { const d = new Date(Date.now() + offsetDays * 86_400_000); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); };
const moduleLabel = (value: string) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Status colours are reserved for state and always paired with a label (never colour alone).
const SEVERITY_STYLE: Record<ErrorSeverity, string> = {
  Critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  High: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Low: 'border-slate-700 bg-white/[0.04] text-slate-300',
};
const STATUS_STYLE: Record<ErrorStatus, string> = {
  New: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  Investigating: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  Resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Ignored: 'border-slate-700 bg-white/[0.04] text-slate-400',
};
const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={cn('inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[11px] font-semibold', className)}>{children}</span>
);

const Tile: React.FC<{ label: string; value: string; sub: string; icon: React.ElementType }> = ({ label, value, sub, icon: Icon }) => (
  <div className="border border-slate-800 bg-matte-black-light p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
    </div>
    <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
    <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
  </div>
);

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, action, children, className }) => (
  <section className={cn('border border-slate-800 bg-matte-black-light p-4', className)}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="py-6 text-center text-sm text-slate-500">{children}</p>;

/** Daily error volume: one series, one hue, thin baseline-anchored bars, hover/focus tooltip, table alternative. */
const TrendChart: React.FC<{ stats: ErrorStats }> = ({ stats }) => {
  const [asTable, setAsTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const days = useMemo(() => {
    const byDay = new Map(stats.trend.map((point) => [point.day, point]));
    const out: Array<{ day: string; errors: number; critical: number }> = [];
    const end = new Date(`${stats.to}T00:00:00Z`).getTime();
    for (let t = new Date(`${stats.from}T00:00:00Z`).getTime(); t <= end && out.length < 120; t += 86_400_000) {
      const day = new Date(t).toISOString().slice(0, 10);
      out.push(byDay.get(day) ?? { day, errors: 0, critical: 0 });
    }
    return out;
  }, [stats]);
  const max = Math.max(1, ...days.map((d) => Number(d.errors)));
  const toggle = <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs font-semibold text-slate-400 underline-offset-2 hover:text-white hover:underline">{asTable ? 'View as chart' : 'View as table'}</button>;
  if (stats.trend.length === 0) return <Panel title="Errors per day"><Empty>No errors were recorded in this period.</Empty></Panel>;
  return (
    <Panel title="Errors per day" action={toggle}>
      {asTable ? (
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-slate-500"><th className="py-1.5 font-semibold">Day</th><th className="py-1.5 text-right font-semibold">Errors</th><th className="py-1.5 text-right font-semibold">Critical</th></tr></thead>
            <tbody>{days.filter((d) => Number(d.errors) > 0).map((d) => <tr key={d.day} className="border-t border-slate-800"><td className="py-1.5 text-slate-300">{shortDay(d.day)}</td><td className="py-1.5 text-right tabular-nums text-white">{number(d.errors)}</td><td className="py-1.5 text-right tabular-nums text-slate-300">{number(d.critical)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="relative">
            <div className="flex h-36 items-end gap-[2px] border-b border-slate-700" role="list" aria-label={`Errors per day from ${shortDay(stats.from)} to ${shortDay(stats.to)}`} onMouseLeave={() => setActive(null)}>
              {days.map((d, index) => (
                <button key={d.day} type="button" role="listitem" aria-label={`${shortDay(d.day)}: ${number(d.errors)} errors, ${number(d.critical)} critical`}
                  onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onBlur={() => setActive(null)}
                  className="flex h-full min-w-0 flex-1 items-end !min-h-0">
                  <span className={cn('block w-full rounded-t-[3px] transition-opacity', active !== null && active !== index ? 'opacity-40' : 'opacity-90')}
                    style={{ height: Number(d.errors) > 0 ? `${Math.max(3, (Number(d.errors) / max) * 100)}%` : 0, background: 'var(--color-gold)' }} />
                </button>
              ))}
            </div>
            {active !== null && (
              <div className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-slate-700 bg-matte-black px-2.5 py-1.5 text-xs shadow-xl"
                style={{ left: `${Math.min(88, Math.max(12, ((active + 0.5) / days.length) * 100))}%` }}>
                <p className="font-semibold text-white">{shortDay(days[active].day)}</p>
                <p className="text-slate-300">{number(days[active].errors)} errors · {number(days[active].critical)} critical</p>
              </div>
            )}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-500"><span>{shortDay(stats.from)}</span><span>Peak {number(max)} / day</span><span>{shortDay(stats.to)}</span></div>
        </div>
      )}
    </Panel>
  );
};

const RankList: React.FC<{ title: string; rows: Array<{ key: string; label: string; value: number; sub?: string; onClick?: () => void }>; empty: string }> = ({ title, rows, empty }) => {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Panel title={title}>
      {rows.length === 0 ? <Empty>{empty}</Empty> : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const body = (
              <>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-slate-200" title={row.label}>{row.label}</span>
                  <span className="shrink-0 tabular-nums text-white">{number(row.value)}{row.sub && <span className="text-slate-500"> · {row.sub}</span>}</span>
                </div>
                <div className="mt-1 h-1.5 bg-white/[0.05]"><div className="h-full rounded-r-[3px] opacity-90" style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: 'var(--color-gold)' }} /></div>
              </>
            );
            return <li key={row.key}>{row.onClick ? <button type="button" onClick={row.onClick} className="block w-full text-left !min-h-0 hover:opacity-80">{body}</button> : body}</li>;
          })}
        </ul>
      )}
    </Panel>
  );
};

const selectClass = 'h-10 w-full min-w-0 border border-slate-800 bg-matte-black px-2 text-sm text-white outline-none focus:ring-1 focus:ring-gold';
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block min-w-0 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}<span className="mt-1 block normal-case tracking-normal">{children}</span></label>
);

/** Investigation drawer: full technical detail, affected organisations, workflow actions and history. */
const ErrorDetailDrawer: React.FC<{ groupId: string; onClose: () => void; onChanged: () => void }> = ({ groupId, onClose, onChanged }) => {
  const toast = useToast();
  const [detail, setDetail] = useState<ErrorGroupDetail | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    setDetail(null); setFailure(null);
    getErrorGroupDetail(groupId).then((data) => { if (live) setDetail(data); }).catch((error) => { if (live) setFailure(error instanceof Error ? error.message : 'This error report could not be loaded.'); });
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { live = false; window.removeEventListener('keydown', onKey); };
  }, [groupId, onClose]);

  const apply = async (change: Parameters<typeof updateErrorGroup>[1], success: string) => {
    setBusy(true);
    try {
      setDetail(await updateErrorGroup(groupId, change));
      if (change.note) setNote('');
      toast.success(success);
      onChanged();
    } catch (error) {
      toast.error('Change was not saved', error instanceof Error ? error.message : undefined);
    } finally { setBusy(false); }
  };

  const g = detail?.group;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close error report" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="error-detail-title" className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-matte-black">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{errorReference(groupId)}</p>
            <h3 id="error-detail-title" className="mt-0.5 break-words text-base font-bold text-white">{g?.message ?? 'Error report'}</h3>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-800 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {failure && <p role="alert" className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{failure}</p>}
          {!detail && !failure && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>}
          {detail && g && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge className={SEVERITY_STYLE[g.severity]}>{g.severity}</Badge>
                <Badge className={STATUS_STYLE[g.status]}>{g.status}</Badge>
                <Badge className="border-slate-700 text-slate-300">{ERROR_TYPE_LABELS[g.error_type]}</Badge>
                <Badge className="border-slate-700 text-slate-300">{moduleLabel(g.module)}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                {[
                  ['Occurrences', number(g.occurrence_count)], ['Organisations affected', number(detail.firms.filter((f) => f.firm_id).length)], ['Users affected', number(detail.affected_users)],
                  ['First seen', dateTime(g.first_seen_at)], ['Last seen', dateTime(g.last_seen_at)], ['Environment', g.environment],
                  ['Error code', g.error_code || '—'], ['Request ID', g.last_request_id || '—'], ['Browser / device', g.last_browser || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-slate-200">{value}</dd></div>
                ))}
              </dl>

              <section className="border border-slate-800 bg-matte-black-light p-3">
                <h4 className="text-sm font-bold text-white">Workflow</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Status">
                    <select className={selectClass} disabled={busy} value={g.status} onChange={(event) => void apply({ status: event.target.value as ErrorStatus }, `Status changed to ${event.target.value}`)}>
                      {ERROR_STATUSES.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned to">
                    <select className={selectClass} disabled={busy} value={g.assigned_to ?? ''} onChange={(event) => void apply({ assigneeId: event.target.value || null }, event.target.value ? 'Issue assigned' : 'Assignment cleared')}>
                      <option value="">Unassigned</option>
                      {detail.assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select className={selectClass} disabled={busy} value={g.severity} onChange={(event) => void apply({ severity: event.target.value as ErrorSeverity }, `Severity changed to ${event.target.value}`)}>
                      {ERROR_SEVERITIES.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </Field>
                </div>
                {g.status !== 'Resolved' && (
                  <button type="button" disabled={busy} onClick={() => void apply({ status: 'Resolved', note: note || undefined }, 'Marked as resolved')}
                    className="mt-3 flex min-h-10 items-center gap-2 bg-gold px-4 text-sm font-bold text-matte-black hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />Mark as resolved after verification
                  </button>
                )}
                <p className="mt-2 text-xs text-slate-500">A resolved issue reopens automatically, with a fresh alert, if the same error occurs again.</p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white">Affected organisations</h4>
                {detail.firms.length === 0 ? <Empty>No organisation data.</Empty> : (
                  <div className="mt-2 overflow-x-auto border border-slate-800">
                    <table className="w-full min-w-[26rem] text-left text-xs">
                      <thead className="bg-white/[0.03] text-slate-500"><tr><th className="p-2 font-semibold">Organisation</th><th className="p-2 text-right font-semibold">Errors</th><th className="p-2 text-right font-semibold">Users</th><th className="p-2 font-semibold">Last seen</th></tr></thead>
                      <tbody>{detail.firms.map((firm) => <tr key={firm.firm_id ?? 'platform'} className="border-t border-slate-800"><td className="p-2 text-slate-200">{firm.firm_name}</td><td className="p-2 text-right tabular-nums text-white">{number(firm.errors)}</td><td className="p-2 text-right tabular-nums text-slate-300">{number(firm.users)}</td><td className="p-2 text-slate-400">{dateTime(firm.last_seen_at)}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                {detail.routes.length > 0 && <p className="mt-2 text-xs text-slate-500">Seen on: <span className="font-mono text-slate-300">{detail.routes.slice(0, 6).join(', ')}</span></p>}
              </section>

              <section>
                <h4 className="text-sm font-bold text-white">Stack trace</h4>
                {g.stack ? <pre tabIndex={0} className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words border border-slate-800 bg-matte-black-light p-3 font-mono text-[11px] leading-5 text-slate-300">{g.stack}</pre>
                  : <p className="mt-2 text-sm text-slate-500">No stack trace was captured for this error (typical for failed network, database and storage requests).</p>}
                <p className="mt-1 text-[11px] text-slate-500">Sensitive values are redacted before storage. Fingerprint <span className="font-mono">{g.fingerprint.slice(0, 12)}</span></p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-white">Investigation notes &amp; history</h4>
                <label htmlFor="error-note" className="sr-only">Add an internal note</label>
                <textarea id="error-note" value={note} maxLength={4000} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add an internal investigation note…"
                  className="mt-2 w-full border border-slate-800 bg-matte-black-light p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-gold" />
                <button type="button" disabled={busy || !note.trim()} onClick={() => void apply({ note }, 'Note added')}
                  className="mt-2 min-h-10 border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50">Add note</button>
                {detail.events.length === 0 ? <Empty>No activity yet.</Empty> : (
                  <ol className="mt-3 space-y-3 border-l border-slate-800 pl-4">
                    {detail.events.map((event) => (
                      <li key={event.id} className="text-sm">
                        <p className="text-slate-200">
                          {event.kind === 'note' ? event.note : event.kind === 'regression' ? 'Reopened automatically — the error occurred again' : `${event.kind === 'status' ? 'Status' : event.kind === 'assignment' ? 'Assignment' : 'Severity'}: ${event.from_value ?? '—'} → ${event.to_value ?? '—'}`}
                        </p>
                        {event.kind === 'severity' && event.note && <p className="text-xs text-slate-400">{event.note}</p>}
                        <p className="text-[11px] text-slate-500">{event.actor_name} · {dateTime(event.created_at)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {detail.alerts.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold text-white">Alerts sent for this issue</h4>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {detail.alerts.map((alert) => <li key={alert.id}>{dateTime(alert.created_at)} · {alert.channel === 'in_app' ? 'In-app' : 'Email'} · {alert.severity} · {alert.reason} · {alert.delivery_status}</li>)}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const AlertsPanel: React.FC<{ refreshKey: number; onOpen: (groupId: string) => void }> = ({ refreshKey, onOpen }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<ErrorAlertSettings | null>(null);
  const [recipients, setRecipients] = useState('');
  const [history, setHistory] = useState<ErrorAlert[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([getAlertSettings(), getAlertHistory()]).then(([s, h]) => { if (!live) return; setSettings(s); setRecipients(s.email_recipients.join(', ')); setHistory(h); }).catch(() => { if (live) setHistory([]); });
    return () => { live = false; };
  }, [refreshKey]);

  const save = async () => {
    if (!settings || !user) return;
    setSaving(true);
    try {
      await saveAlertSettings({ ...settings, email_recipients: recipients.split(',') }, user.id);
      toast.success('Alert settings saved');
    } catch (error) { toast.error('Alert settings were not saved', error instanceof Error ? error.message : undefined); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Notification channels">
        {!settings ? <Empty>Loading…</Empty> : (
          <div className="space-y-4 text-sm">
            <p className="text-xs leading-5 text-slate-500">Critical errors alert immediately and High-severity errors raise a priority alert. Each issue alerts once; it alerts again only if it escalates, returns after being resolved, or is still recurring after the re-alert window. Medium and Low errors appear on this dashboard only.</p>
            <label className="flex items-start gap-3 text-slate-200"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold" checked={settings.in_app_enabled} onChange={(e) => setSettings({ ...settings, in_app_enabled: e.target.checked })} /><span>In-app notifications<span className="block text-xs text-slate-500">Shown in the GodAdmin notification centre.</span></span></label>
            <label className="flex items-start gap-3 text-slate-200"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold" checked={settings.email_enabled} onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })} /><span>Email<span className="block text-xs text-amber-300">Email alerts are queued as “pending”. No mail provider is connected yet, so they are not delivered.</span></span></label>
            <Field label="Email recipients (comma separated)"><input type="text" className={selectClass} value={recipients} disabled={!settings.email_enabled} onChange={(e) => setRecipients(e.target.value)} placeholder="ops@example.com" /></Field>
            <Field label="Re-alert a recurring issue after (hours)"><input type="number" min={1} max={168} className={selectClass} value={settings.realert_hours} onChange={(e) => setSettings({ ...settings, realert_hours: Math.min(168, Math.max(1, Number(e.target.value) || 1)) })} /></Field>
            <button type="button" onClick={() => void save()} disabled={saving} className="flex min-h-10 items-center gap-2 bg-gold px-4 text-sm font-bold text-matte-black hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save alert settings</button>
          </div>
        )}
      </Panel>
      <Panel title="Notification history">
        {!history ? <Empty>Loading…</Empty> : history.length === 0 ? <Empty>No alerts have been raised yet.</Empty> : (
          <ul className="max-h-96 divide-y divide-slate-800 overflow-y-auto">
            {history.map((alert) => (
              <li key={alert.id}>
                <button type="button" onClick={() => alert.group_id && onOpen(alert.group_id)} className="block w-full py-2.5 text-left hover:bg-white/[0.03]">
                  <span className="flex flex-wrap items-center gap-2"><Badge className={SEVERITY_STYLE[alert.severity]}>{alert.severity}</Badge><span className="text-xs text-slate-400">{alert.channel === 'in_app' ? 'In-app' : 'Email'} · {alert.reason} · {alert.delivery_status}</span></span>
                  <span className="mt-1 block truncate text-sm text-slate-200">{alert.error_groups?.message ?? 'Error report'}</span>
                  <span className="text-[11px] text-slate-500">{dateTime(alert.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

const HEALTH_AREAS: Array<{ label: string; types: ErrorType[]; note?: string }> = [
  { label: 'API requests', types: ['api'] },
  { label: 'Database', types: ['database'] },
  { label: 'File storage', types: ['storage'] },
  { label: 'Authentication', types: ['auth'] },
  { label: 'Timeouts & slow responses', types: ['performance'] },
  { label: 'Connectivity', types: ['network'] },
  { label: 'Background jobs & schedules', types: ['job', 'integration'], note: 'Server-side jobs do not report here yet.' },
  { label: 'Application crashes', types: ['react', 'frontend'] },
];

const HealthPanel: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [probes, setProbes] = useState<HealthProbe[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [recent, setRecent] = useState<ErrorStats | null>(null);
  const check = useCallback(async () => { setChecking(true); try { setProbes(await runHealthProbes()); } finally { setChecking(false); } }, []);
  useEffect(() => { void check(); }, [check]);
  useEffect(() => { let live = true; getErrorStats({ from: isoDay(-1), to: isoDay(0) }).then((s) => { if (live) setRecent(s); }).catch(() => undefined); return () => { live = false; }; }, [refreshKey]);
  const countFor = (types: ErrorType[]) => (recent?.by_type ?? []).filter((row) => types.includes(row.error_type)).reduce((sum, row) => sum + Number(row.errors), 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Live service checks" action={<button type="button" onClick={() => void check()} disabled={checking} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"><RefreshCw className={cn('h-3.5 w-3.5', checking && 'animate-spin')} />Check now</button>}>
        {!probes ? <Empty>Checking services…</Empty> : (
          <ul className="divide-y divide-slate-800">
            {probes.map((probe) => (
              <li key={probe.name} className="flex items-center gap-3 py-2.5 text-sm">
                {probe.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                <span className="min-w-0 flex-1"><span className="text-slate-200">{probe.name}</span><span className="block truncate text-xs text-slate-500">{probe.ok ? 'Operational' : `Unavailable — ${probe.detail}`}</span></span>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{number(probe.ms)} ms</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-4 text-slate-500">Measured from this browser on demand. Response times include your own network latency.</p>
      </Panel>
      <Panel title="Failures in the last 24 hours">
        {!recent ? <Empty>Loading…</Empty> : (
          <ul className="divide-y divide-slate-800">
            {HEALTH_AREAS.map((area) => {
              const count = countFor(area.types);
              return (
                <li key={area.label} className="flex items-center gap-3 py-2.5 text-sm">
                  {count === 0 ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}
                  <span className="min-w-0 flex-1 text-slate-200">{area.label}{area.note && <span className="block text-xs text-slate-500">{area.note}</span>}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-300">{count === 0 ? 'No failures reported' : `${number(count)} failure${count === 1 ? '' : 's'}`}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-4 text-slate-500">Expected outcomes — validation messages, cancelled requests, sign-in mistakes and permission denials — are not counted as failures.</p>
      </Panel>
    </div>
  );
};

type View = 'errors' | 'health' | 'alerts';
const defaultFilters = (): ErrorFilters => ({ from: isoDay(-29), to: isoDay(0), firmId: '', module: '', severity: '', type: '', status: '', search: '' });

export const SystemHealthPanel: React.FC<{ firms: Array<{ id: string; name: string }> }> = ({ firms }) => {
  const [view, setView] = useState<View>('errors');
  const [filters, setFilters] = useState<ErrorFilters>(defaultFilters);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [list, setList] = useState<{ total: number; rows: ErrorGroupRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => { const timer = setTimeout(() => { setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText })); setPage(0); }, 350); return () => clearTimeout(timer); }, [searchText]);

  useEffect(() => {
    const request = ++requestRef.current;
    setLoading(true); setFailure(null);
    Promise.all([getErrorStats(filters), listErrorGroups(filters, page, PAGE_SIZE)])
      .then(([nextStats, nextList]) => { if (request === requestRef.current) { setStats(nextStats); setList(nextList); setUnavailable(false); } })
      .catch((error) => { if (request !== requestRef.current) return; if (isMonitoringUnavailable(error)) setUnavailable(true); else setFailure(error instanceof Error ? error.message : 'Error data could not be loaded.'); })
      .finally(() => { if (request === requestRef.current) setLoading(false); });
  }, [filters, page, refreshKey]);

  const setFilter = <K extends keyof ErrorFilters>(key: K, value: ErrorFilters[K]) => { setFilters((f) => ({ ...f, [key]: value })); setPage(0); };
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeDrawer = useCallback(() => setOpenGroup(null), []);
  const pages = Math.max(1, Math.ceil((list?.total ?? 0) / PAGE_SIZE));
  const filtered = JSON.stringify({ ...filters, search: '' }) !== JSON.stringify({ ...defaultFilters(), search: '' }) || Boolean(filters.search);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">System Health &amp; Error Monitoring</h2>
          <p className="text-sm text-slate-500">Technical issues captured automatically across every organisation.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex border border-slate-800" role="tablist" aria-label="Monitoring views">
            {([['errors', 'Errors'], ['health', 'System health'], ['alerts', 'Alerts']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={cn('min-h-10 px-3 text-sm font-semibold transition-colors', view === id ? 'bg-gold/10 text-gold' : 'text-slate-400 hover:text-white')}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={refresh} aria-label="Refresh error data" className="flex h-10 w-10 items-center justify-center border border-slate-800 text-slate-400 hover:text-white"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
        </div>
      </div>

      {unavailable ? (
        <div role="status" className="border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          Error monitoring is not enabled on this database yet. Apply the migration <span className="font-mono">20261115061000_error_monitoring.sql</span> to start collecting error reports.
        </div>
      ) : view === 'health' ? <HealthPanel refreshKey={refreshKey} /> : view === 'alerts' ? <AlertsPanel refreshKey={refreshKey} onOpen={setOpenGroup} /> : (
        <>
          {failure && <p role="alert" className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{failure}</p>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile label="Total errors" value={stats ? number(stats.total_errors) : '—'} sub={stats ? `${number(stats.issues)} distinct issues` : 'In selected period'} icon={Activity} />
            <Tile label="Critical errors" value={stats ? number(stats.critical_errors) : '—'} sub="Occurrences in period" icon={AlertOctagon} />
            <Tile label="Unresolved" value={stats ? number(stats.unresolved_issues) : '—'} sub="New or investigating" icon={ShieldAlert} />
            <Tile label="Errors today" value={stats ? number(stats.errors_today) : '—'} sub="Since midnight IST" icon={CalendarClock} />
            <Tile label="Organisations" value={stats ? number(stats.affected_firms) : '—'} sub="Affected in period" icon={Building2} />
          </div>

          <section aria-label="Filters" className="border border-slate-800 bg-matte-black-light p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <Field label="From"><input type="date" className={selectClass} value={filters.from} max={filters.to} onChange={(e) => setFilter('from', e.target.value)} /></Field>
              <Field label="To"><input type="date" className={selectClass} value={filters.to} min={filters.from} max={isoDay(0)} onChange={(e) => setFilter('to', e.target.value)} /></Field>
              <Field label="Organisation"><select className={selectClass} value={filters.firmId} onChange={(e) => setFilter('firmId', e.target.value)}><option value="">All</option>{firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}</select></Field>
              <Field label="Module"><select className={selectClass} value={filters.module} onChange={(e) => setFilter('module', e.target.value)}><option value="">All</option>{(stats?.modules ?? []).slice().sort().map((m) => <option key={m} value={m}>{moduleLabel(m)}</option>)}</select></Field>
              <Field label="Severity"><select className={selectClass} value={filters.severity} onChange={(e) => setFilter('severity', e.target.value as ErrorSeverity | '')}><option value="">All</option>{ERROR_SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Category"><select className={selectClass} value={filters.type} onChange={(e) => setFilter('type', e.target.value as ErrorType | '')}><option value="">All</option>{ERROR_TYPES.map((t) => <option key={t} value={t}>{ERROR_TYPE_LABELS[t]}</option>)}</select></Field>
              <Field label="Status"><select className={selectClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value as ErrorStatus | '')}><option value="">All</option>{ERROR_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Search"><span className="relative block"><Search className="pointer-events-none absolute left-2 top-3 h-4 w-4 text-slate-500" /><input type="search" className={cn(selectClass, 'pl-8')} value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Text or ERR-…" /></span></Field>
            </div>
            {filtered && <button type="button" onClick={() => { setFilters(defaultFilters()); setSearchText(''); setPage(0); }} className="mt-3 text-xs font-semibold text-slate-400 underline-offset-2 hover:text-white hover:underline">Clear filters</button>}
          </section>

          {stats && (
            <div className="grid gap-4 lg:grid-cols-2">
              <TrendChart stats={stats} />
              <RankList title="Most frequent errors" empty="No errors in this period." rows={stats.top_issues.map((issue) => ({ key: issue.group_id, label: issue.message, value: Number(issue.errors), sub: `${issue.severity} · ${moduleLabel(issue.module)}`, onClick: () => setOpenGroup(issue.group_id) }))} />
              <RankList title="Errors by organisation" empty="No organisation was affected in this period." rows={stats.by_firm.map((firm) => ({ key: firm.firm_id ?? 'platform', label: firm.firm_name, value: Number(firm.errors), sub: `${number(firm.issues)} issue${Number(firm.issues) === 1 ? "" : "s"}`, onClick: firm.firm_id ? () => setFilter('firmId', firm.firm_id as string) : undefined }))} />
              <RankList title="Errors by module" empty="No module reported errors in this period." rows={stats.by_module.map((m) => ({ key: m.module, label: moduleLabel(m.module), value: Number(m.errors), sub: `${number(m.issues)} issue${Number(m.issues) === 1 ? "" : "s"}`, onClick: () => setFilter('module', m.module) }))} />
            </div>
          )}

          <section className="border border-slate-800 bg-matte-black-light">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
              <h3 className="text-sm font-bold text-white">Recent error activity</h3>
              <p className="text-xs text-slate-500">{list ? `${number(list.total)} issue${list.total === 1 ? '' : 's'}` : ''}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="p-3 font-semibold">Error</th><th className="p-3 font-semibold">Module</th><th className="p-3 font-semibold">Severity</th><th className="p-3 font-semibold">Status</th><th className="p-3 text-right font-semibold">Occurrences</th><th className="p-3 text-right font-semibold">Orgs / users</th><th className="p-3 font-semibold">Last seen</th><th className="p-3 font-semibold">Assigned</th></tr>
                </thead>
                <tbody>
                  {loading && !list && Array.from({ length: 5 }, (_, i) => <tr key={i} className="border-t border-slate-800"><td colSpan={8} className="p-3"><div className="h-5 animate-pulse bg-white/[0.05]" /></td></tr>)}
                  {list?.rows.map((row) => (
                    <tr key={row.id} className="cursor-pointer border-t border-slate-800 hover:bg-white/[0.03]" onClick={() => setOpenGroup(row.id)}>
                      <td className="max-w-[22rem] p-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setOpenGroup(row.id); }} className="block w-full text-left !min-h-0">
                          <span className="block truncate font-medium text-white" title={row.message}>{row.message}</span>
                          <span className="font-mono text-[11px] text-slate-500">{errorReference(row.id)} · {ERROR_TYPE_LABELS[row.error_type]}{row.error_code ? ` · ${row.error_code}` : ''}</span>
                        </button>
                      </td>
                      <td className="p-3 text-slate-300">{moduleLabel(row.module)}</td>
                      <td className="p-3"><Badge className={SEVERITY_STYLE[row.severity]}>{row.severity}</Badge></td>
                      <td className="p-3"><Badge className={STATUS_STYLE[row.status]}>{row.status}</Badge></td>
                      <td className="p-3 text-right tabular-nums text-white">{number(row.errors_in_range)}</td>
                      <td className="p-3 text-right tabular-nums text-slate-300">{number(row.affected_firms)} / {number(row.affected_users)}</td>
                      <td className="whitespace-nowrap p-3 text-slate-400">{dateTime(row.last_seen_at)}</td>
                      <td className="p-3 text-slate-300">{row.assignee_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list && list.rows.length === 0 && !loading && <Empty>{filtered ? 'No errors match these filters.' : 'No errors have been reported in the last 30 days.'}</Empty>}
            {list && list.total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-800 p-3 text-xs text-slate-400">
                <span>Page {page + 1} of {pages}</span>
                <span className="flex gap-2">
                  <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="flex h-9 w-9 items-center justify-center border border-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" aria-label="Next page" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="flex h-9 w-9 items-center justify-center border border-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                </span>
              </div>
            )}
          </section>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" />Identical errors are grouped under one report. Occurrence data is kept for 90 days; resolved and ignored reports are removed 180 days after they were last seen.</p>
        </>
      )}

      {openGroup && <ErrorDetailDrawer groupId={openGroup} onClose={closeDrawer} onChanged={refresh} />}
    </div>
  );
};
