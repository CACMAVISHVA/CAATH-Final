/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { DocumentVaultFile, DocumentUploadInput, DocumentSearchParams } from './documentTypes';
import { writeDocumentAudit } from './documentAuditService';
import { orchestrateDocumentIntelligence } from './documentIntelligenceOrchestrationService';
import { createRuntimeNotification } from '../notificationRuntimeService';

export const uploadDocument = async (input: DocumentUploadInput): Promise<DocumentVaultFile> => {
  const { file, firmId, clientId, category, documentType, user, ...linking } = input;

  // Upload file to Supabase Storage
  const fileName = `${firmId}/${clientId}/${category}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  // Insert document record
  const { data, error } = await supabase
    .from('document_vault')
    .insert([{
      firm_id: firmId,
      client_id: clientId,
      category,
      document_type: documentType,
      name: file.name,
      file_path: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      linked_task_id: linking.linkedTaskId || null,
      linked_compliance_id: linking.linkedComplianceId || null,
      linked_invoice_id: linking.linkedInvoiceId || null,
      linked_notice_id: linking.linkedNoticeId || null,
      linked_approval_id: linking.linkedApprovalId || null,
      version: 1,
      is_archived: false,
      is_deleted: false,
      tags: linking.tags || [],
      uploaded_by: user.id,
      uploaded_by_name: user.name,
    }])
    .select()
    .single();

  if (error) throw error;

  // Write audit log
  await writeDocumentAudit({
    firmId,
    user,
    documentId: data.id,
    clientId,
    action: 'uploaded',
    details: `Uploaded "${file.name}" to ${category} folder`,
  });

  try {
    await orchestrateDocumentIntelligence(data as DocumentVaultFile, user, firmId);
  } catch (orchestrationError) {
    console.warn('Document intelligence orchestration failed:', orchestrationError);
  }

  await createRuntimeNotification({
    firmId,
    audienceRole: 'Admin',
    eventType: 'document_uploaded',
    title: 'Document uploaded',
    message: `${user.name} uploaded "${file.name}" for review.`,
    priority: 'MEDIUM',
    user,
  });

  return data as DocumentVaultFile;
};

export const getDocuments = async (params: DocumentSearchParams): Promise<DocumentVaultFile[]> => {
  let query = supabase
    .from('document_vault')
    .select('*')
    .eq('firm_id', params.firmId)
    .eq('is_deleted', params.includeDeleted ? false : false);

  if (params.clientId) {
    query = query.eq('client_id', params.clientId);
  }
  if (params.category) {
    query = query.eq('category', params.category);
  }
  if (params.documentType) {
    query = query.eq('document_type', params.documentType);
  }
  if (params.uploadedBy) {
    query = query.eq('uploaded_by', params.uploadedBy);
  }
  if (params.linkedTaskId) {
    query = query.eq('linked_task_id', params.linkedTaskId);
  }
  if (params.linkedNoticeId) {
    query = query.eq('linked_notice_id', params.linkedNoticeId);
  }
  if (!params.includeArchived) {
    query = query.eq('is_archived', false);
  }
  if (params.query) {
    query = query.ilike('name', `%${params.query}%`);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DocumentVaultFile[];
};

export const getDocument = async (documentId: string): Promise<DocumentVaultFile | null> => {
  const { data, error } = await supabase
    .from('document_vault')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as DocumentVaultFile | null;
};

export const getClientDocuments = async (clientId: string): Promise<DocumentVaultFile[]> => {
  const { data, error } = await supabase
    .from('document_vault')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentVaultFile[];
};

export const getArchivedDocuments = async (firmId: string): Promise<DocumentVaultFile[]> => {
  const { data, error } = await supabase
    .from('document_vault')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_archived', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentVaultFile[];
};

export const getDeletedDocuments = async (firmId: string): Promise<DocumentVaultFile[]> => {
  const { data, error } = await supabase
    .from('document_vault')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_deleted', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentVaultFile[];
};

export const updateDocument = async (
  documentId: string,
  updates: Partial<{
    name: string;
    category: string;
    document_type: string;
    tags: string[];
    linked_task_id: string;
    linked_compliance_id: string;
    linked_invoice_id: string;
    linked_notice_id: string;
    linked_approval_id: string;
  }>,
  user: { id: string; name: string; role: string },
  firmId: string
) => {
  const { error } = await supabase
    .from('document_vault')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  if (updates.name) {
    await writeDocumentAudit({
      firmId,
      user,
      documentId,
      action: 'renamed',
      details: `Renamed to "${updates.name}"`,
    });
  }
};

export const searchDocuments = async (params: DocumentSearchParams) => {
  return getDocuments({ ...params, query: params.query });
};
