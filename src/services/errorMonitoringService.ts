/**
 * Read/workflow API for the GodAdmin System Health & Error Monitoring section.
 * All access control is enforced in the database (RLS + GodAdmin-checked RPCs);
 * these helpers only shape requests and responses.
 */
import { supabase } from '../lib/supabase';
import type { ErrorSeverity, ErrorType } from './errorReporter';

export type ErrorStatus = 'New' | 'Investigating' | 'Resolved' | 'Ignored';
export const ERROR_SEVERITIES: ErrorSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
export const ERROR_STATUSES: ErrorStatus[] = ['New', 'Investigating', 'Resolved', 'Ignored'];
export const ERROR_TYPES: ErrorType[] = ['frontend', 'react', 'api', 'database', 'auth', 'storage', 'network', 'performance', 'job', 'integration', 'validation', 'unknown'];
export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  frontend: 'Frontend', react: 'UI crash', api: 'API', database: 'Database', auth: 'Authentication', storage: 'Storage', network: 'Network',
  performance: 'Performance / timeout', job: 'Background job', integration: 'Integration', validation: 'Data validation', unknown: 'Other',
};

export interface ErrorFilters {
  from?: string; to?: string; firmId?: string; module?: string;
  severity?: ErrorSeverity | ''; type?: ErrorType | ''; status?: ErrorStatus | ''; search?: string;
}

export interface ErrorStats {
  from: string; to: string;
  total_errors: number; issues: number; critical_errors: number; unresolved_issues: number; errors_today: number; affected_firms: number;
  by_firm: Array<{ firm_id: string | null; firm_name: string; errors: number; issues: number }>;
  by_module: Array<{ module: string; errors: number; issues: number }>;
  by_type: Array<{ error_type: ErrorType; errors: number }>;
  top_issues: Array<{ group_id: string; message: string; module: string; severity: ErrorSeverity; status: ErrorStatus; errors: number }>;
  trend: Array<{ day: string; errors: number; critical: number }>;
  modules: string[];
}

export interface ErrorGroupRow {
  id: string; error_type: ErrorType; module: string; severity: ErrorSeverity; status: ErrorStatus; message: string;
  error_code: string | null; environment: string; assigned_to: string | null; assignee_name: string | null;
  occurrence_count: number; first_seen_at: string; last_seen_at: string;
  errors_in_range: number; affected_firms: number; affected_users: number;
}

export interface ErrorGroupDetail {
  group: ErrorGroupRow & { stack: string | null; base_severity: ErrorSeverity; last_request_id: string | null; last_browser: string | null; resolved_at: string | null; fingerprint: string };
  affected_users: number;
  firms: Array<{ firm_id: string | null; firm_name: string; errors: number; users: number; last_seen_at: string }>;
  routes: string[];
  daily: Array<{ day: string; errors: number }>;
  events: Array<{ id: number; kind: 'note' | 'status' | 'assignment' | 'severity' | 'regression'; from_value: string | null; to_value: string | null; note: string | null; created_at: string; actor_name: string }>;
  alerts: ErrorAlert[];
  assignees: Array<{ id: string; name: string }>;
}

export interface ErrorAlert { id: number; group_id?: string; severity: ErrorSeverity; channel: 'in_app' | 'email'; delivery_status: 'sent' | 'pending' | 'failed'; reason: string; created_at: string; error_groups?: { message: string; module: string } | null }
export interface ErrorAlertSettings { in_app_enabled: boolean; email_enabled: boolean; email_recipients: string[]; realert_hours: number }
export interface HealthProbe { name: string; ok: boolean; ms: number; detail: string }
export interface FirmErrorSummaryRow { reference: string; module: string; error_type: ErrorType; severity: ErrorSeverity; status: ErrorStatus; message: string; occurrences: number; last_seen_at: string }

export const errorReference = (groupId: string): string => `ERR-${groupId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/** True when the error-monitoring migration has not been applied to this database. */
export const isMonitoringUnavailable = (error: unknown): boolean =>
  ['PGRST202', 'PGRST205', '42883', '42P01'].includes(String((error as { code?: unknown } | null)?.code ?? ''));

const filterArgs = (filters: ErrorFilters) => ({
  p_from: filters.from || null, p_to: filters.to || null, p_firm: filters.firmId || null, p_module: filters.module || null,
  p_severity: filters.severity || null, p_type: filters.type || null, p_status: filters.status || null,
});

export const getErrorStats = async (filters: ErrorFilters): Promise<ErrorStats> => {
  const { data, error } = await supabase.rpc('error_monitor_stats', filterArgs(filters));
  if (error) throw error;
  return data as ErrorStats;
};

export const listErrorGroups = async (filters: ErrorFilters, page: number, pageSize: number): Promise<{ total: number; rows: ErrorGroupRow[] }> => {
  const { data, error } = await supabase.rpc('error_monitor_list', { ...filterArgs(filters), p_search: filters.search?.trim() || null, p_limit: pageSize, p_offset: page * pageSize });
  if (error) throw error;
  return data as { total: number; rows: ErrorGroupRow[] };
};

export const getErrorGroupDetail = async (groupId: string): Promise<ErrorGroupDetail> => {
  const { data, error } = await supabase.rpc('error_group_detail', { p_group: groupId });
  if (error) throw error;
  return data as ErrorGroupDetail;
};

export const updateErrorGroup = async (groupId: string, change: { status?: ErrorStatus; assigneeId?: string | null; severity?: ErrorSeverity; note?: string }): Promise<ErrorGroupDetail> => {
  const { data, error } = await supabase.rpc('error_group_update', {
    p_group: groupId, p_status: change.status ?? null, p_assignee: change.assigneeId || null, p_clear_assignee: change.assigneeId === null,
    p_severity: change.severity ?? null, p_note: change.note?.trim() || null,
  });
  if (error) throw error;
  return data as ErrorGroupDetail;
};

export const getAlertSettings = async (): Promise<ErrorAlertSettings> => {
  const { data, error } = await supabase.from('error_alert_settings').select('in_app_enabled, email_enabled, email_recipients, realert_hours').maybeSingle();
  if (error) throw error;
  return data ?? { in_app_enabled: true, email_enabled: false, email_recipients: [], realert_hours: 6 };
};

export const saveAlertSettings = async (settings: ErrorAlertSettings, updatedBy: string): Promise<void> => {
  const recipients = settings.email_recipients.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (recipients.some((item) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))) throw new Error('Enter valid email addresses, separated by commas.');
  if (recipients.length > 10) throw new Error('Use at most 10 alert recipients.');
  const { error } = await supabase.from('error_alert_settings')
    .update({ in_app_enabled: settings.in_app_enabled, email_enabled: settings.email_enabled, email_recipients: recipients, realert_hours: settings.realert_hours, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) throw error;
};

export const getAlertHistory = async (limit = 30): Promise<ErrorAlert[]> => {
  const { data, error } = await supabase.from('error_alerts')
    .select('id, group_id, severity, channel, delivery_status, reason, created_at, error_groups(message, module)')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as ErrorAlert[];
};

const timed = async (name: string, run: () => Promise<string | null>): Promise<HealthProbe> => {
  const started = performance.now();
  try {
    const failure = await Promise.race([run(), new Promise<string>((resolve) => setTimeout(() => resolve('No response within 10 seconds'), 10_000))]);
    return { name, ok: failure === null, ms: Math.round(performance.now() - started), detail: failure ?? 'Responding' };
  } catch (error) {
    return { name, ok: false, ms: Math.round(performance.now() - started), detail: error instanceof Error ? error.message : 'Check failed' };
  }
};

/** Live reachability checks, run on demand from the dashboard (never on a timer). */
export const runHealthProbes = (): Promise<HealthProbe[]> => Promise.all([
  timed('Database', async () => (await supabase.from('firms').select('id', { head: true, count: 'exact' }).limit(1)).error?.message ?? null),
  timed('Authentication', async () => (await supabase.auth.getUser()).error?.message ?? null),
  timed('File storage', async () => (await supabase.storage.from('firm-branding').list('', { limit: 1 })).error?.message ?? null),
  timed('Application API', async () => {
    const response = await fetch('/api/health', { cache: 'no-store' });
    return response.ok && (response.headers.get('content-type') ?? '').includes('json') ? null : `Health endpoint returned ${response.status}`;
  }),
]);

/** Stack-free list of technical issues that affected the caller's own workspace (SuperAdmin / Admin only). */
export const getFirmErrorSummary = async (): Promise<FirmErrorSummaryRow[]> => {
  const { data, error } = await supabase.rpc('firm_error_summary');
  if (error) throw error;
  return (data ?? []) as FirmErrorSummaryRow[];
};
