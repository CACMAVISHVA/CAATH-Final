import { supabase } from '../../../lib/supabase';
import { EnterpriseActivity } from '../../../services/observabilityService';

export const operationalCollaborationRepository = {
  async createDiscussionActivity(payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('enterprise_activities')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    return data as EnterpriseActivity;
  },

  async listActivities(firmId: string, limit: number) {
    const { data, error } = await supabase
      .from('enterprise_activities')
      .select('*')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as EnterpriseActivity[];
  },

  async listApprovals(firmId: string) {
    const { data, error } = await supabase
      .from('approval_tasks')
      .select('id,status,updated_at')
      .eq('firm_id', firmId);
    if (error) throw error;
    return data || [];
  },
};
