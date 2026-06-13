import { supabase } from '../lib/supabase';
import { User } from '../types';
import { sanitizeAuditDetailsForPlatform } from './dataSovereigntyService';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface EnterpriseAuditLog {
  id: string;
  firm_id: string | null;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  severity?: AuditSeverity | null;
  created_at: string;
}

export interface EnterpriseAuditLogExtended extends EnterpriseAuditLog {
  // portal-specific fields (if present)
  portal_type?: string | null;
  success?: boolean | null;
  timestamp?: string | null; // alias for portal timestamp
}

export const writeAuditLog = async ({
  firmId,
  user,
  action,
  entityType,
  entityId,
  details,
  severity = 'info',
}: {
  firmId?: string;
  user: User;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  severity?: AuditSeverity;
}) => {
  const { error } = await supabase.from('audit_logs').insert([{
    firm_id: firmId || null,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details,
    severity,
  }]);
  if (error) throw error;
};

export const getAuditLogs = async ({
  firmId,
  query,
  category,
  severity,
  limit = 100,
}: {
  firmId?: string;
  query?: string;
  category?: string;
  severity?: AuditSeverity | 'all';
  limit?: number;
}) => {
  let request = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (firmId) request = request.eq('firm_id', firmId);
  if (category && category !== 'All') request = request.eq('entity_type', category);
  if (severity && severity !== 'all') request = request.eq('severity', severity);
  if (query) request = request.or(`action.ilike.%${query}%,details.ilike.%${query}%,user_name.ilike.%${query}%`);

  const { data, error } = await request;
  if (error) throw error;
  return (data || []) as EnterpriseAuditLog[];
};

export type AuditQueryOptions = {
  firmId?: string;
  query?: string;
  portalType?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action?: string;
  entityType?: string;
  since?: string; // ISO
  until?: string; // ISO
  status?: 'success' | 'failure' | AuditSeverity | 'all';
  includePortal?: boolean; // include portal_audit_logs
  limit?: number;
  offset?: number;
  cursorBefore?: string; // created_at cursor
  cursorAfter?: string;
};

const MAX_EXPORT_LIMIT = 10000;

const mapPortalRowToExtended = (r: any): EnterpriseAuditLogExtended => ({
  id: r.id,
  firm_id: r.client_id || null,
  user_id: r.user_id || '',
  user_name: r.user_name || '',
  user_role: r.user_role || '',
  action: r.action || '',
  entity_type: 'Portal',
  entity_id: null,
  details: r.details || '',
  severity: null,
  created_at: r.timestamp || r.created_at || new Date().toISOString(),
  portal_type: r.portal_type,
  success: r.success ?? null,
  timestamp: r.timestamp || null,
});

const applyPlatformAuditRedaction = (logs: EnterpriseAuditLogExtended[], isPlatformScope: boolean) => {
  if (!isPlatformScope) return logs;
  return logs.map((log) => ({
    ...log,
    details: sanitizeAuditDetailsForPlatform(log.details || ''),
  }));
};

export const getEnterpriseAuditLogs = async (opts: AuditQueryOptions = {}): Promise<EnterpriseAuditLogExtended[]> => {
  const safeLimit = Math.min(Math.max(1, opts.limit ?? 50), 1000);
  const safeOffset = Math.max(0, opts.offset ?? 0);

  const filtersFor = (qb: any, isPortal = false) => {
    if (opts.firmId) qb = qb.eq(isPortal ? 'client_id' : 'firm_id', opts.firmId);
    if (opts.entityType && !isPortal) qb = qb.eq('entity_type', opts.entityType);
    if (opts.userId) qb = qb.eq('user_id', opts.userId);
    if (opts.userName) qb = qb.ilike('user_name', `%${opts.userName}%`);
    if (opts.userRole) qb = qb.eq('user_role', opts.userRole);
    if (opts.action) qb = qb.ilike('action', `%${opts.action}%`);
    if (opts.query) {
      const q = opts.query.replace(/'/g, "'");
      qb = qb.or(isPortal ? `action.ilike.%${q}%,details.ilike.%${q}%,user_name.ilike.%${q}%` : `action.ilike.%${q}%,details.ilike.%${q}%,user_name.ilike.%${q}%`);
    }
    if (opts.since) qb = qb.gte(isPortal ? 'timestamp' : 'created_at', opts.since);
    if (opts.until) qb = qb.lte(isPortal ? 'timestamp' : 'created_at', opts.until);
    if (opts.status) {
      if (opts.status === 'success') {
        if (isPortal) qb = qb.eq('success', true);
      } else if (opts.status === 'failure') {
        if (isPortal) qb = qb.eq('success', false);
      } else if (opts.status !== 'all' && !isPortal) {
        qb = qb.eq('severity', opts.status);
      }
    }
    if (opts.cursorBefore) qb = qb.lt(isPortal ? 'timestamp' : 'created_at', opts.cursorBefore);
    if (opts.cursorAfter) qb = qb.gt(isPortal ? 'timestamp' : 'created_at', opts.cursorAfter);
    return qb;
  };

  // If includePortal requested, fetch both and merge client-side
  if (opts.includePortal) {
    const [auditRes, portalRes] = await Promise.all([
      (async () => {
        let q = supabase.from('audit_logs').select('id, firm_id, user_id, user_name, user_role, action, entity_type, entity_id, details, severity, created_at').order('created_at', { ascending: false });
        q = filtersFor(q, false);
        const { data } = await q.range(safeOffset, safeOffset + safeLimit - 1);
        return (data || []) as any[];
      })(),
      (async () => {
        let q = supabase.from('portal_audit_logs').select('id, client_id, user_id, user_name, user_role, action, portal_type, details, success, timestamp').order('timestamp', { ascending: false });
        q = filtersFor(q, true);
        const { data } = await q.range(safeOffset, safeOffset + safeLimit - 1);
        return (data || []) as any[];
      })(),
    ]);

    const mapped = [
      ...auditRes.map((r) => ({ ...(r as any), created_at: r.created_at })),
      ...portalRes.map(mapPortalRowToExtended),
    ];

    const sorted = mapped.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return applyPlatformAuditRedaction(sorted.slice(0, safeLimit) as EnterpriseAuditLogExtended[], !opts.firmId);
  }

  // If portalType specified, query portal_audit_logs only
  if (opts.portalType) {
    let q = supabase
      .from('portal_audit_logs')
      .select('id, client_id, user_id, user_name, user_role, action, portal_type, details, success, timestamp')
      .eq('portal_type', opts.portalType)
      .order('timestamp', { ascending: false });

    q = filtersFor(q, true);
    const { data, error } = await q.range(safeOffset, safeOffset + safeLimit - 1);
    if (error) throw error;
    return applyPlatformAuditRedaction((data || []).map(mapPortalRowToExtended) as EnterpriseAuditLogExtended[], !opts.firmId);
  }

  // Default: query standard audit_logs
  let q = supabase.from('audit_logs').select('id, firm_id, user_id, user_name, user_role, action, entity_type, entity_id, details, severity, created_at').order('created_at', { ascending: false });
  q = filtersFor(q, false);
  const { data, error } = await q.range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return applyPlatformAuditRedaction((data || []) as EnterpriseAuditLogExtended[], !opts.firmId);
};

export const exportAuditToCSV = async (opts: AuditQueryOptions = {}, filename?: string) => {
  const fetchLimit = Math.min(MAX_EXPORT_LIMIT, opts.limit ?? 5000);
  const logs = await getEnterpriseAuditLogs({ ...opts, limit: fetchLimit, offset: 0, includePortal: opts.includePortal ?? true });
  const headers = ['created_at', 'user_name', 'user_role', 'action', 'entity_type', 'portal_type', 'details', 'severity', 'success'];
  const csv = [headers.join(','), ...logs.map((log) => headers.map((h) => JSON.stringify((log as any)[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || `enterprise-audit-${new Date().toISOString().split('T')[0]}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportAuditToExcel = async (opts: AuditQueryOptions = {}, filename?: string) => {
  // Minimal Excel support via CSV blob with .xls extension for compatibility
  await exportAuditToCSV(opts, filename || `enterprise-audit-${new Date().toISOString().split('T')[0]}.xls`);
};

export const exportAuditToPrintablePDF = async (opts: AuditQueryOptions = {}) => {
  // Prepare printable HTML and open print dialog; users can save as PDF
  const logs = await getEnterpriseAuditLogs({ ...opts, limit: Math.min(1000, opts.limit ?? 1000), includePortal: opts.includePortal ?? true });
  const win = window.open('', '_blank');
  if (!win) throw new Error('Unable to open print window');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Audit Export</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h2>Audit Export</h2><table><thead><tr>${['Time','User','Role','Action','Entity','Portal','Details','Severity','Success'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${logs.map(l=>`<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.user_name||''}</td><td>${l.user_role||''}</td><td>${l.action||''}</td><td>${l.entity_type||''}</td><td>${(l as any).portal_type||''}</td><td>${(l.details||'').replace(/</g,'&lt;')}</td><td>${l.severity||''}</td><td>${(l as any).success==null?'':(l as any).success}</td></tr>`).join('')}</tbody></table></body></html>`;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

export const exportAuditLogs = (logs: EnterpriseAuditLog[]) => {
  const headers = ['created_at', 'user_name', 'user_role', 'action', 'entity_type', 'details', 'severity'];
  const csv = [headers.join(','), ...logs.map((log) => headers.map((header) => JSON.stringify(log[header as keyof EnterpriseAuditLog] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};
