import { supabase } from '../lib/supabase';
import { User } from '../types';
import { GSTClientOption } from './gstComplianceLifecycleService';

export type GspConnection = {
  id: string; client_id: string; gstin: string; provider_code: string; environment: 'sandbox' | 'production';
  status: string; consent_status: 'Active' | 'Revoked' | 'Expired'; consent_granted_at: string;
  last_verified_at: string | null; last_sync_at: string | null; client?: { name?: string } | null;
};
export type GspPlatformStatus = { provider: string | null; environment: string; configured: boolean; missing: string[]; productionEnabled: boolean; adapterVersion: string };

export const loadGspIntegrationReadiness = async (firmId: string) => {
  const [{ data: sessionData }, connectionResult] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from('gst_gsp_connections').select('*,client:clients(name)').eq('firm_id', firmId).order('created_at', { ascending: false }),
  ]);
  if (connectionResult.error) throw connectionResult.error;
  const token = sessionData.session?.access_token;
  let platform: GspPlatformStatus = { provider: null, environment: 'sandbox', configured: false, missing: ['Provider onboarding pending'], productionEnabled: false, adapterVersion: 'caath-gsp-contract-v1' };
  if (token) {
    const response = await fetch('/api/gst-gsp-status', { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({})) as { configuration?: GspPlatformStatus; error?: string };
    if (response.ok && payload.configuration) platform = payload.configuration;
  }
  return { platform, connections: (connectionResult.data || []) as unknown as GspConnection[] };
};

export const grantGspSandboxConsent = async (user: User, client: GSTClientOption, providerCode: string) => {
  if (!user.firmId || user.role !== 'SuperAdmin') throw new Error('Only the workspace Super Admin can grant GST API consent.');
  if (!client.gstin) throw new Error('The selected client needs a valid GSTIN.');
  const { error } = await supabase.from('gst_gsp_connections').insert({
    firm_id: user.firmId, client_id: client.id, gstin: client.gstin, provider_code: providerCode,
    environment: 'sandbox', status: 'Awaiting Provider', consent_status: 'Active',
    consent_scope: ['returns.read', 'notices.read', 'challans.read'], consent_granted_by: user.id,
  });
  if (error?.code === '23505') throw new Error('Sandbox consent already exists for this client and provider.');
  if (error) throw error;
};

export const revokeGspConsent = async (id: string) => {
  const { error } = await supabase.from('gst_gsp_connections').update({ consent_status: 'Revoked', consent_revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
};
