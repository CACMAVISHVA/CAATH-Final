import React, { useEffect, useMemo, useState } from 'react';
import { Download, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import {
  AuditSeverity,
  EnterpriseAuditLogExtended,
  exportAuditToCSV,
  exportAuditToExcel,
  exportAuditToPrintablePDF,
  getEnterpriseAuditLogs,
} from '../services/auditLogService';

export const AuditCenter: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EnterpriseAuditLogExtended[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [severity, setSeverity] = useState<AuditSeverity | 'all'>('all');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [portalType, setPortalType] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const pageSize = limit;

  useEffect(() => {
    // reset pagination on filter change
    setOffset(0);
    setHasMore(true);
    (async () => {
      try {
        const results = await getEnterpriseAuditLogs({
          firmId: user?.firmId,
          query,
          entityType: category === 'All' ? undefined : category,
          since: since || undefined,
          until: until || undefined,
          userName: userName || undefined,
          userRole: userRole || undefined,
          action: actionFilter || undefined,
          portalType: portalType || undefined,
          status: severity as any,
          limit: pageSize,
          offset: 0,
          includePortal: true,
        });
        setLogs(results);
        setHasMore(results.length >= pageSize);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [user?.firmId, query, category, severity, userName, userRole, actionFilter, portalType, since, until]);

  const loadMore = async () => {
    const next = offset + pageSize;
    try {
      const more = await getEnterpriseAuditLogs({
        firmId: user?.firmId,
        query,
        entityType: category === 'All' ? undefined : category,
        since: since || undefined,
        until: until || undefined,
        userName: userName || undefined,
        userRole: userRole || undefined,
        action: actionFilter || undefined,
        portalType: portalType || undefined,
        status: severity as any,
        limit: pageSize,
        offset: next,
        includePortal: true,
      });
      setLogs((cur) => [...cur, ...more]);
      setOffset(next);
      setHasMore(more.length >= pageSize);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = useMemo(() => ['All', ...new Set(logs.map((log) => log.entity_type))], [logs]);

  const grouped = useMemo(() => {
    const map: Record<string, EnterpriseAuditLogExtended[]> = {};
    logs.forEach((l) => {
      const day = new Date(l.created_at).toLocaleDateString();
      if (!map[day]) map[day] = [];
      map[day].push(l);
    });
    return map;
  }, [logs]);

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Audit Center</h2>
          <p className="text-sm text-slate-500">Searchable governance timeline across operational actions.</p>
        </div>
        <button onClick={() => exportAuditToCSV({ firmId: user?.firmId, query, entityType: category === 'All' ? undefined : category, since: since || undefined, until: until || undefined, userName: userName || undefined, userRole: userRole || undefined, action: actionFilter || undefined, portalType: portalType || undefined, includePortal: true })} className="flex items-center gap-2 border border-slate-800 px-4 py-2 text-sm font-bold hover:text-gold">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full border border-slate-800 bg-matte-black-light py-2 pl-10 pr-3 text-sm text-white" placeholder="Search activity..." />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="border border-slate-800 bg-matte-black-light px-3 py-2 text-sm">
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value as AuditSeverity | 'all')} className="border border-slate-800 bg-matte-black-light px-3 py-2 text-sm">
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div className="space-y-3">
        {Object.keys(grouped).length === 0 && (
          <div className="border border-slate-800 p-10 text-center text-slate-500">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8" />
            No audit events found.
          </div>
        )}

        {Object.entries(grouped).map(([day, items]) => {
          const expanded = !!expandedDays[day];
          const preview = expanded ? items : items.slice(0, 5);
          return (
            <div key={day} className="space-y-2">
              <div className="text-sm text-slate-400 font-bold">{day} • {items.length} events</div>
              {preview.map((log) => (
                <div key={log.id} className="border border-slate-800 bg-matte-black-light p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">{log.action}</p>
                      <p className="text-xs text-slate-500">{log.user_name} | {log.user_role} | {log.entity_type}{log.portal_type ? ` • ${log.portal_type}` : ''}</p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-[10px] font-bold uppercase',
                      log.severity === 'critical' && 'bg-red-500/10 text-red-400',
                      log.severity === 'warning' && 'bg-amber-500/10 text-amber-400',
                      (!log.severity || log.severity === 'info') && 'bg-blue-500/10 text-blue-300'
                    )}>
                      {log.severity || (log.success === false ? 'failure' : 'info')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300 line-clamp-3">{log.details}</p>
                  <p className="mt-2 text-[10px] text-slate-600">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))}
              {items.length > 5 && (
                <button onClick={() => setExpandedDays((s) => ({ ...s, [day]: !expanded }))} className="text-sm text-slate-400 mt-1">
                  {expanded ? 'Show less' : `Show ${items.length - 5} more`}
                </button>
              )}
            </div>
          );
        })}
        <div className="mt-4 flex gap-3">
          {hasMore && (
            <button onClick={loadMore} className="px-4 py-2 border border-slate-800 rounded-xl text-sm">Load more</button>
          )}
          <button onClick={() => exportAuditToCSV({ firmId: user?.firmId, query, entityType: category === 'All' ? undefined : category, since: since || undefined, until: until || undefined, userName: userName || undefined, userRole: userRole || undefined, action: actionFilter || undefined, portalType: portalType || undefined, includePortal: true })} className="px-4 py-2 border border-slate-800 rounded-xl text-sm">Export CSV</button>
          <button onClick={() => exportAuditToExcel({ firmId: user?.firmId, includePortal: true })} className="px-4 py-2 border border-slate-800 rounded-xl text-sm">Export Excel</button>
          <button onClick={() => exportAuditToPrintablePDF({ firmId: user?.firmId, includePortal: true })} className="px-4 py-2 border border-slate-800 rounded-xl text-sm">Export PDF</button>
        </div>
      </div>
    </div>
  );
};
