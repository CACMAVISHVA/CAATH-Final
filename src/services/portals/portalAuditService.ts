/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { PortalAuditLog, PortalAuditLogQueryOptions, PortalCredentialAuditAction, PortalType } from './portalTypes';

export const PORTAL_AUDIT_RETENTION_DAYS = 365;

export const createPortalAuditLog = async (params: {
  clientId: string;
  portalType: PortalType;
  user: { id: string; name: string; role?: string };
  action: PortalCredentialAuditAction;
  success: boolean;
  details?: string;
  errorMessage?: string;
}) => {
  await supabase.from('portal_audit_logs').insert([{
    client_id: params.clientId,
    portal_type: params.portalType,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role || 'Unknown',
    action: params.action,
    timestamp: new Date().toISOString(),
    success: params.success,
    details: params.details || null,
    error_message: params.errorMessage || null,
  }]);
};

export const getPortalAuditLogs = async (
  clientId: string,
  options: PortalAuditLogQueryOptions = {}
): Promise<PortalAuditLog[]> => {
  const safeLimit = Math.min(Math.max(1, options.limit ?? 50), 200);
  const safeOffset = Math.max(0, options.offset ?? 0);

  let query = supabase
    .from('portal_audit_logs')
    .select('id, client_id, portal_type, user_id, user_name, action, ip_address, user_agent, timestamp, success, details, error_message')
    .eq('client_id', clientId)
    .order('timestamp', { ascending: false });

  if (options.portalType) {
    query = query.eq('portal_type', options.portalType);
  }
  if (options.success !== undefined) {
    query = query.eq('success', options.success);
  }
  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options.since) {
    query = query.gte('timestamp', options.since);
  }
  if (options.until) {
    query = query.lte('timestamp', options.until);
  }

  const { data, error } = await query.range(safeOffset, safeOffset + safeLimit - 1);

  if (error) throw error;
  return (data || []) as PortalAuditLog[];
};

const buildPortalActivitySummary = (logs: PortalAuditLog[]) => {
  const summary = {
    total: logs.length,
    failed: logs.filter((log) => !log.success).length,
    byPortal: {} as Record<string, number>,
    byAction: {} as Record<string, number>,
  };

  logs.forEach((log) => {
    summary.byPortal[log.portal_type] = (summary.byPortal[log.portal_type] || 0) + 1;
    summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
  });

  return summary;
};

export const getPortalActivitySummary = async (clientId: string) => {
  const logs = await getPortalAuditLogs(clientId, { limit: 30 });
  return {
    summary: buildPortalActivitySummary(logs),
    recent: logs,
  };
};

export const getPortalActivitySummaryGlobal = async () => {
  const { data, error } = await supabase
    .from('portal_audit_logs')
    .select('id, client_id, portal_type, user_id, user_name, action, ip_address, user_agent, timestamp, success, details, error_message')
    .order('timestamp', { ascending: false })
    .limit(30);

  if (error) throw error;

  const logs = (data || []) as PortalAuditLog[];
  return {
    summary: buildPortalActivitySummary(logs),
    recent: logs,
  };
};
