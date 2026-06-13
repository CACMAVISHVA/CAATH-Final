import { supabase } from '../lib/supabase';
import { User } from '../types';
import { logEnterpriseActivity } from './observabilityService';

export type CompensationStatus = 'Draft' | 'Active' | 'Paused';

export interface WorkforceEmployeeProfile {
  id: string;
  firm_id: string;
  user_id: string;
  employee_code: string;
  department: string;
  team: string;
  designation: string;
  joining_date: string;
  reporting_manager_id: string | null;
  compensation_status: CompensationStatus;
  created_at: string;
  updated_at: string;
}

const MOCK_WORKFORCE: WorkforceEmployeeProfile[] = [
  {
    id: 'wf-1',
    firm_id: 'f1',
    user_id: 's1',
    employee_code: 'EMP-001',
    department: 'Tax',
    team: 'Direct Tax',
    designation: 'Senior Associate',
    joining_date: '2024-06-01',
    reporting_manager_id: null,
    compensation_status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getWorkforceProfiles = async (firmId: string, actor?: User): Promise<WorkforceEmployeeProfile[]> => {
  try {
    let query = supabase
      .from('workforce_profiles')
      .select('*')
      .eq('firm_id', firmId);
    if (actor && (actor.role === 'Admin' || actor.role === 'Staff')) {
      query = query.eq('user_id', actor.id);
    }
    const { data, error } = await query.order('joining_date', { ascending: false });
    if (error) throw error;
    return (data || []) as WorkforceEmployeeProfile[];
  } catch {
    return MOCK_WORKFORCE.filter((item) => item.firm_id === firmId && (!actor || !['Admin', 'Staff'].includes(actor.role) || item.user_id === actor.id));
  }
};

export const upsertWorkforceProfile = async (
  input: Omit<WorkforceEmployeeProfile, 'id' | 'created_at' | 'updated_at'>,
  user: User
) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('workforce_profiles')
      .upsert([{ ...input, updated_at: now }], { onConflict: 'firm_id,user_id' })
      .select('id')
      .single();
    if (error) throw error;
    await logEnterpriseActivity({
      firm_id: input.firm_id,
      event_type: 'workforce',
      event_subtype: 'profile_upsert',
      actor_id: user.id,
      actor_name: user.name,
      actor_role: user.role,
      reference_id: data?.id,
      reference_table: 'workforce_profiles',
      severity: 'info',
      details: { user_id: input.user_id, designation: input.designation },
    } as any);
    return data;
  } catch {
    return { id: `wf-${Date.now()}` };
  }
};
