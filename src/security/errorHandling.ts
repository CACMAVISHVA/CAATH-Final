import { SecurityAppError, toSafeError } from './secureError';
import { logSecurityEvent } from './monitoring/eventLogger';

export const withSecurityBoundary = async <T>(
  operation: () => Promise<T>,
  context: { action: string; actorId?: string; actorRole?: string; tenantId?: string }
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const safe = toSafeError(error);
    await logSecurityEvent({
      type: 'security.validation_failure',
      actorId: context.actorId,
      actorRole: context.actorRole,
      tenantId: context.tenantId,
      severity: safe.status >= 500 ? 'critical' : 'warning',
      timestamp: new Date().toISOString(),
      metadata: { action: context.action, code: safe.code, status: safe.status },
    });
    throw new SecurityAppError(safe.message, safe.code, safe.status, safe.safeMessage);
  }
};
