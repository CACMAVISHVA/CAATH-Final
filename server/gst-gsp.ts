import type { IncomingMessage } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';

export type GspEnvironment = 'sandbox' | 'production';
export type GspOperation = 'FETCH_RETURNS' | 'FETCH_NOTICES' | 'FETCH_CHALLANS' | 'FILE_RETURN' | 'GENERATE_CHALLAN' | 'CHECK_STATUS';

export interface GspAdapter {
  readonly provider: string;
  readonly environment: GspEnvironment;
  checkConfiguration(): { configured: boolean; missing: string[] };
  execute<T>(operation: GspOperation, payload: Record<string, unknown>): Promise<T>;
}

export const getGspConfigurationStatus = () => {
  const provider = String(process.env.GST_GSP_PROVIDER || '').trim();
  const environment: GspEnvironment = process.env.GST_GSP_ENV === 'production' ? 'production' : 'sandbox';
  const required = provider.toLowerCase() === 'cleartax'
    ? ['GST_GSP_PROVIDER', 'GST_GSP_BASE_URL', 'GST_GSP_AUTH_TOKEN']
    : ['GST_GSP_PROVIDER', 'GST_GSP_BASE_URL', 'GST_GSP_CLIENT_ID', 'GST_GSP_CLIENT_SECRET'];
  const missing = required.filter((name) => !String(process.env[name] || '').trim());
  return {
    provider: provider || null,
    environment,
    configured: missing.length === 0,
    missing,
    productionEnabled: environment === 'production' && process.env.GST_GSP_PRODUCTION_ENABLED === 'true',
    adapterVersion: 'caath-gsp-contract-v1',
  };
};

export const authenticateGspManager = async (req: IncomingMessage, db: SupabaseClient) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) throw Object.assign(new Error('Sign in again to continue.'), { statusCode: 401 });
  const { data, error } = await db.auth.getUser(auth.slice(7));
  if (error || !data.user) throw Object.assign(new Error('Sign in again to continue.'), { statusCode: 401 });
  const { data: profile, error: profileError } = await db.from('users').select('id,firm_id,role,status').eq('auth_id', data.user.id).maybeSingle();
  if (profileError || !profile || !profile.firm_id || profile.status !== 'Active' || !['SuperAdmin', 'Admin'].includes(profile.role)) {
    throw Object.assign(new Error('Only an active Super Admin or Admin can manage GST integrations.'), { statusCode: 403 });
  }
  return profile as { id: string; firm_id: string; role: string; status: string };
};

export class UnconfiguredGspAdapter implements GspAdapter {
  readonly provider = getGspConfigurationStatus().provider || 'unselected';
  readonly environment = getGspConfigurationStatus().environment;
  checkConfiguration() { const status = getGspConfigurationStatus(); return { configured: status.configured, missing: status.missing }; }
  async execute<T>(_operation: GspOperation, _payload: Record<string, unknown>): Promise<T> {
    throw Object.assign(new Error('A GSTN-empanelled GSP must be selected and its sandbox adapter certified before API operations are enabled.'), { statusCode: 503 });
  }
}
