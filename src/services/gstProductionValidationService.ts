import { supabase } from '../lib/supabase';
import { User } from '../types';
import { GSTIntelligenceStorageEnvelope } from '../domains/gst-intelligence/storage/storageContracts';

export type GSTProductionValidationStage = 'upload' | 'storage' | 'parsing' | 'persistence' | 'retrieval' | 'analysis_execution';
export type GSTProductionValidationStatus = 'PASS' | 'FAIL' | 'PARTIAL';

export type GSTProductionValidationRecord = {
  stage: GSTProductionValidationStage;
  status: GSTProductionValidationStatus;
  detail: string;
  createdAt: string;
};

export const recordGSTValidationArtifact = async (
  envelope: GSTIntelligenceStorageEnvelope,
  user: User,
  records: GSTProductionValidationRecord[],
) => {
  if (!user.firmId) throw new Error('Firm workspace is required.');
  const { error } = await supabase.from('enterprise_activities').insert([{
    firm_id: user.firmId,
    event_type: 'gst_intelligence',
    event_subtype: 'production_validation',
    reference_id: envelope.clientId,
    reference_table: 'clients',
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    severity: records.some((item) => item.status === 'FAIL') ? 'warning' : 'info',
    details: {
      envelope,
      validation: records,
    },
  }]);
  if (error) throw error;
};

export const getLatestGSTValidationArtifact = async (firmId: string, clientId?: string) => {
  let query = supabase
    .from('enterprise_activities')
    .select('id, details, created_at')
    .eq('firm_id', firmId)
    .eq('event_type', 'gst_intelligence')
    .eq('event_subtype', 'production_validation')
    .order('created_at', { ascending: false })
    .limit(1);

  if (clientId) query = query.eq('reference_id', clientId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};
