import { supabase } from '../lib/supabase';

export interface ControlTowerSnapshot {
  activeFirms: number;
  suspendedFirms: number;
  pendingSubscriptions: number;
  activeRevenue: number;
  criticalAlerts: number;
  orchestrationHealth: 'healthy' | 'watch' | 'critical';
}

export interface UsageMonitoringSnapshot {
  workflowVolume30d: number;
  telemetryLoad30d: number;
  automationUsage30d: number;
  connectorEvents30d: number;
  activeUsersEstimate: number;
  storageUsageEstimateMb: number;
}

export interface PlatformConfigSnapshot {
  activePlans: number;
  pendingEntitlements: number;
  governanceEvents7d: number;
  featureActivationRate: number;
}

const daysAgoIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const safeCount = async (table: string, since?: string) => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (since) query = query.gte('created_at', since);
  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
};

export const loadControlTowerSnapshot = async (): Promise<ControlTowerSnapshot> => {
  const [firmsRes, subsRes, criticalEvents] = await Promise.all([
    supabase.from('firms').select('status'),
    supabase.from('subscriptions').select('status, amount'),
    supabase
      .from('enterprise_activities')
      .select('id', { count: 'exact', head: true })
      .in('severity', ['critical', 'warning'])
      .gte('created_at', daysAgoIso(7)),
  ]);

  const firms = firmsRes.data || [];
  const subs = subsRes.data || [];
  const activeFirms = firms.filter((f) => f.status === 'Active').length;
  const suspendedFirms = firms.filter((f) => f.status === 'Suspended').length;
  const pendingSubscriptions = subs.filter((s) => s.status === 'Pending').length;
  const activeRevenue = subs
    .filter((s) => s.status === 'Active')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const criticalAlerts = criticalEvents.count || 0;
  const orchestrationHealth =
    criticalAlerts > 50 ? 'critical' : criticalAlerts > 10 ? 'watch' : 'healthy';

  return {
    activeFirms,
    suspendedFirms,
    pendingSubscriptions,
    activeRevenue,
    criticalAlerts,
    orchestrationHealth,
  };
};

export const loadUsageMonitoringSnapshot = async (): Promise<UsageMonitoringSnapshot> => {
  const windowStart = daysAgoIso(30);
  const [
    workflowVolume30d,
    telemetryLoad30d,
    automationUsage30d,
    connectorEvents30d,
    activeUsersEstimate,
    storageUsageEstimateMb,
  ] = await Promise.all([
    safeCount('tasks', windowStart),
    safeCount('enterprise_activities', windowStart),
    safeCount('automation_runs', windowStart),
    (async () => {
      const { count, error } = await supabase
        .from('enterprise_activities')
        .select('id', { count: 'exact', head: true })
        .or('event_type.eq.integration,event_subtype.eq.integration');
      if (error) return 0;
      return count || 0;
    })(),
    safeCount('users'),
    (async () => {
      const [docs, activities] = await Promise.all([
        safeCount('documents'),
        safeCount('enterprise_activities', windowStart),
      ]);
      return docs * 2 + Math.round(activities * 0.04);
    })(),
  ]);

  return {
    workflowVolume30d,
    telemetryLoad30d,
    automationUsage30d,
    connectorEvents30d,
    activeUsersEstimate,
    storageUsageEstimateMb,
  };
};

export const loadPlatformConfigSnapshot = async (): Promise<PlatformConfigSnapshot> => {
  const [subsRes, governanceEvents7d] = await Promise.all([
    supabase.from('subscriptions').select('plan, status'),
    safeCount('audit_logs', daysAgoIso(7)),
  ]);

  const subs = subsRes.data || [];
  const activePlans = new Set(subs.filter((s) => s.status === 'Active').map((s) => s.plan)).size;
  const pendingEntitlements = subs.filter((s) => s.status === 'Pending').length;
  const activeCount = subs.filter((s) => s.status === 'Active').length;
  const totalCount = subs.length || 1;
  const featureActivationRate = Math.round((activeCount / totalCount) * 100);

  return {
    activePlans,
    pendingEntitlements,
    governanceEvents7d,
    featureActivationRate,
  };
};
