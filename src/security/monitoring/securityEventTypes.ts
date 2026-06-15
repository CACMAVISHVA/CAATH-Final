export type SecurityEventType =
  | 'auth.login_attempt'
  | 'auth.login_success'
  | 'auth.login_failure'
  | 'auth.logout'
  | 'auth.session_refresh'
  | 'auth.mfa_challenge'
  | 'auth.mfa_verify'
  | 'portal.credential_access'
  | 'portal.credential_reveal'
  | 'admin.action'
  | 'support.ticket_action'
  | 'security.rate_limited'
  | 'security.tenant_violation'
  | 'security.validation_failure';

export interface SecurityEvent {
  type: SecurityEventType;
  actorId?: string;
  actorRole?: string;
  tenantId?: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  metadata?: Record<string, unknown>;
}
