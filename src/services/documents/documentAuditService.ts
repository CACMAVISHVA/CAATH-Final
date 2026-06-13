/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { User } from '../../types';

export type DocumentAuditUser = {
  id: string;
  name: string;
  role: string;
};

export const writeDocumentAudit = async (params: {
  firmId: string;
  user: DocumentAuditUser;
  documentId: string;
  clientId?: string;
  action: 'uploaded' | 'downloaded' | 'viewed' | 'renamed' | 'deleted' | 'archived' | 'restored' | 'shared' | 'version_added';
  details: string;
}) => {
  await supabase.from('document_audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    document_id: params.documentId,
    client_id: params.clientId || null,
    action: params.action,
    details: params.details,
  }]);
};

export const logDocumentView = async (documentId: string, user: User, firmId: string, clientId?: string) => {
  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    clientId,
    action: 'viewed',
    details: 'Document viewed',
  });
};

export const logDocumentDownload = async (documentId: string, user: User, firmId: string, clientId?: string) => {
  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    clientId,
    action: 'downloaded',
    details: 'Document downloaded',
  });
};

export const getDocumentAuditTrail = async (documentId: string) => {
  const { data, error } = await supabase
    .from('document_audit_logs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};
