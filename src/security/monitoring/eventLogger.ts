import { supabase } from '../../lib/supabase';
import { SecurityEvent } from './securityEventTypes';

export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  try {
    await supabase.from('audit_logs').insert([{
      firm_id: event.tenantId || null,
      tenant_id: event.tenantId || null,
      actor_id: event.actorId || null,
      actor_role: event.actorRole || null,
      user_id: event.actorId || null,
      user_name: 'system',
      user_role: event.actorRole || 'system',
      action: event.type,
      entity_type: 'security_event',
      entity_id: null,
      details: JSON.stringify(event.metadata || {}),
      severity: event.severity,
      ip_metadata: null,
      device_metadata: null,
    }]);
  } catch {
    // Avoid throwing in security logger path to prevent business flow disruption.
  }
};
