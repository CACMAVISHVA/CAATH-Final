import { supabase } from '../lib/supabase';
import { UserRole } from '../types';
import { sanitizeForPlatformTelemetry } from './dataSovereigntyService';

export type TelemetryMetric =
  | 'workflow_transition'
  | 'workflow_escalation'
  | 'reassignment_frequency'
  | 'approval_throughput'
  | 'revenue_lifecycle'
  | 'payroll_governance'
  | 'event_propagation';

export interface OperationalTelemetryRecord {
  firmId: string;
  metric: TelemetryMetric;
  eventName: string;
  severity?: 'info' | 'notice' | 'warning' | 'critical';
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
  workflowId?: string;
  workflowType?: string;
  payload?: Record<string, unknown>;
}

export interface TelemetryTrendPoint {
  date: string;
  count: number;
}

export interface TelemetryTrendSummary {
  metric: TelemetryMetric;
  points: TelemetryTrendPoint[];
  total: number;
}

export const recordOperationalTelemetry = async (record: OperationalTelemetryRecord) => {
  const sanitizedPayload = sanitizeForPlatformTelemetry(record.payload);
  const { data, error } = await supabase.from('enterprise_activities').insert([{
    firm_id: record.firmId,
    event_type: 'operational_telemetry',
    event_subtype: record.metric,
    reference_id: record.workflowId || null,
    reference_table: record.workflowType || null,
    actor_id: record.actorId || null,
    actor_name: record.actorName || null,
    actor_role: record.actorRole || null,
    severity: record.severity || 'info',
    details: {
      eventName: record.eventName,
      payload: sanitizedPayload,
      recordedAt: new Date().toISOString(),
    },
  }]);

  if (error) throw error;
  return data?.[0];
};

export const getTelemetryTrendSummary = async (
  firmId: string,
  metric: TelemetryMetric,
  days = 14
): Promise<TelemetryTrendSummary> => {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('enterprise_activities')
    .select('created_at, details')
    .eq('firm_id', firmId)
    .eq('event_type', 'operational_telemetry')
    .eq('event_subtype', metric)
    .gte('created_at', from)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const bucket: Record<string, number> = {};
  (data || []).forEach((row) => {
    const d = new Date(row.created_at).toISOString().split('T')[0];
    bucket[d] = (bucket[d] || 0) + 1;
  });

  const points = Object.entries(bucket).map(([date, count]) => ({ date, count }));
  const total = points.reduce((sum, item) => sum + item.count, 0);

  return { metric, points, total };
};
