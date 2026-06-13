import { supabase } from '../../lib/supabase';
import { buildSecurityAuditMetadata, withSecurityBoundary, SecurityAppError } from '../../security';

type PortalSecretsResponse<T> = {
  data: T;
};

export const invokePortalSecrets = async <T>(payload: Record<string, unknown>): Promise<T> => {
  return withSecurityBoundary(async () => {
    const { data, error } = await supabase.functions.invoke<PortalSecretsResponse<T>>('portal-secrets', {
      body: {
        ...payload,
        metadata: buildSecurityAuditMetadata(),
      },
    });

    if (error) {
      throw new SecurityAppError('Portal security operation failed.', 'UNKNOWN_ERROR', 400, 'Unable to process secure request.');
    }
    if (!data) throw new SecurityAppError('portal-secrets returned an empty response.', 'UNKNOWN_ERROR', 500, 'Unable to process secure request.');
    return data.data;
  }, { action: 'portal-secrets.invoke' });
};
