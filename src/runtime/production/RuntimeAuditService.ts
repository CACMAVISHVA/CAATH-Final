import { supabase } from '../../lib/supabase';
import { AuditRuntimeCoordinator } from '../audit';
import { withRetry, withTimeout } from './RuntimeResilience';

type RuntimeAuditInput = {
  tenantId?: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  correlationId: string;
  severity?: 'info' | 'warning' | 'error';
};

export class RuntimeAuditService {
  readonly runtime = new AuditRuntimeCoordinator();

  async append(input: RuntimeAuditInput): Promise<void> {
    this.runtime.append({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: input.tenantId || 'system',
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: { details: input.details, severity: input.severity || 'info' },
      correlationId: input.correlationId,
      occurredAt: new Date().toISOString(),
    });

    await withRetry(
      async () => {
        const { error } = await withTimeout<{ error: { message: string } | null }>(
          supabase.from('audit_logs').insert([{
            firm_id: input.tenantId || null,
            user_id: input.actorId || null,
            user_name: 'Runtime',
            user_role: input.actorRole || 'System',
            action: input.action,
            entity_type: input.entityType,
            entity_id: input.entityId,
            details: input.details,
            severity: input.severity || 'info',
            created_at: new Date().toISOString(),
          }]),
          4000,
          'runtime_audit_insert_timeout',
        );
        if (error) throw error;
      },
      2,
    );
  }
}

export const runtimeAuditService = new RuntimeAuditService();
