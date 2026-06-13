/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PortalType = 'GST' | 'MCA' | 'IncomeTax' | 'ICEGATE' | 'EPFO' | 'ESIC' | 'Banking' | 'Custom';

export interface PortalCredential {
  id: string;
  client_id: string;
  firm_id?: string;
  portal_type: PortalType;
  portal_name: string;
  portal_url: string;
  username: string;
  encrypted_username?: string;
  encrypted_password?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  security_notes: string | null;
  last_login: string | null;
  last_filing_date?: string | null;
  credential_ref?: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PortalCredentialAuditAction =
  | 'login'
  | 'view_credentials'
  | 'failed_attempt'
  | 'delete_credential'
  | 'create_credential'
  | 'update_credential';

export type PortalCredentialSecret = Pick<PortalCredential, 'id' | 'portal_type' | 'encrypted_password'>;

export type PortalCredentialSummary = Pick<PortalCredential,
  'id' |
  'client_id' |
  'portal_type' |
  'portal_name' |
  'portal_url' |
  'username' |
  'gstin' |
  'pan' |
  'cin' |
  'last_login' |
  'last_filing_date' |
  'assigned_to' |
  'credential_ref'
>;

export interface PortalCredentialInput {
  clientId: string;
  portalType: PortalType;
  portalName: string;
  portalUrl?: string;
  username: string;
  password: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  securityNotes?: string;
  user: { id: string; name: string; role: string };
}

export type PortalCredentialUpdatePayload = Partial<{
  portalName: string;
  portalUrl: string;
  username: string;
  password: string;
  gstin: string;
  pan: string;
  cin: string;
  securityNotes: string;
}>;

export interface PortalAuditLog {
  id: string;
  client_id: string;
  portal_type: PortalType;
  user_id: string;
  user_name: string;
  action: PortalCredentialAuditAction;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  details?: string | null;
  error_message?: string | null;
}

export interface PortalAuditLogQueryOptions {
  portalType?: PortalType;
  since?: string;
  until?: string;
  success?: boolean;
  userId?: string;
  limit?: number;
  offset?: number;
}
