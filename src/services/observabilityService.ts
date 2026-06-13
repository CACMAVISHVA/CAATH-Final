import { supabase } from '../lib/supabase';
import { sanitizeForPlatformTelemetry } from './dataSovereigntyService';

export interface EnterpriseActivity {
  id: string;
  firm_id: string;
  event_type: string;
  event_subtype?: string | null;
  reference_id?: string | null;
  reference_table?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  details?: any;
  severity?: 'info' | 'notice' | 'warning' | 'critical';
  created_at: string;
}

export interface AutomationRun {
  id: string;
  firm_id: string;
  automation_key: string;
  status: string;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  run_payload?: any;
  result?: any;
  error?: string | null;
  created_at: string;
}

export const logEnterpriseActivity = async (activity: Partial<EnterpriseActivity>) => {
  const rawDetails = activity.details;
  const detailsObject = rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)
    ? (rawDetails as Record<string, unknown>)
    : {};
  const sanitizedActivity: Partial<EnterpriseActivity> = {
    ...activity,
    details: sanitizeForPlatformTelemetry(detailsObject),
  };
  const { data, error } = await supabase.from('enterprise_activities').insert([sanitizedActivity]);
  if (error) throw error;
  return data?.[0];
};

export const queryEnterpriseActivities = async (opts: {
  firmId: string;
  eventTypes?: string[];
  actorId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}) => {
  const { firmId, eventTypes, actorId, search, limit = 50, offset = 0, from, to } = opts;
  let qb = supabase.from('enterprise_activities').select('*').eq('firm_id', firmId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  if (eventTypes && eventTypes.length) qb = qb.in('event_type', eventTypes);
  if (actorId) qb = qb.eq('actor_id', actorId);
  if (from) qb = qb.gte('created_at', from);
  if (to) qb = qb.lte('created_at', to);

  const { data, error } = await qb;
  if (error) throw error;
  return data as EnterpriseActivity[];
};

export const recordAutomationRun = async (run: Partial<AutomationRun>) => {
  const { data, error } = await supabase.from('automation_runs').insert([run]);
  if (error) throw error;
  return data?.[0];
};

export const getAutomationRuns = async (firmId: string, limit = 50) => {
  const { data, error } = await supabase.from('automation_runs').select('*').eq('firm_id', firmId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as AutomationRun[];
};

export default {
  logEnterpriseActivity,
  queryEnterpriseActivities,
  recordAutomationRun,
  getAutomationRuns,
};
