/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { DocumentVaultFile } from './documentTypes';
import { getDocument } from './documentCoreService';
import { writeDocumentAudit } from './documentAuditService';

export const addDocumentVersion = async (
  parentDocumentId: string,
  file: File,
  user: { id: string; name: string; role: string },
  firmId: string
) => {
  const parent = await getDocument(parentDocumentId);
  if (!parent) throw new Error('Parent document not found');

  // Upload new version to storage
  const fileName = `${firmId}/${parent.client_id}/${parent.category}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  // Create new version record
  const { data, error } = await supabase
    .from('document_vault')
    .insert([{
      firm_id: firmId,
      client_id: parent.client_id,
      category: parent.category,
      document_type: parent.document_type,
      name: file.name,
      file_path: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      linked_task_id: parent.linked_task_id,
      linked_compliance_id: parent.linked_compliance_id,
      linked_invoice_id: parent.linked_invoice_id,
      linked_notice_id: parent.linked_notice_id,
      linked_approval_id: parent.linked_approval_id,
      parent_document_id: parentDocumentId,
      version: parent.version + 1,
      is_archived: false,
      is_deleted: false,
      tags: parent.tags,
      uploaded_by: user.id,
      uploaded_by_name: user.name,
    }])
    .select()
    .single();

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId: data.id,
    clientId: parent.client_id || undefined,
    action: 'version_added',
    details: `Added version ${parent.version + 1} of document`,
  });

  return data as DocumentVaultFile;
};

export const getDocumentVersions = async (documentId: string): Promise<DocumentVaultFile[]> => {
  const doc = await getDocument(documentId);
  if (!doc) return [];

  const { data, error } = await supabase
    .from('document_vault')
    .select('*')
    .eq('parent_document_id', doc.parent_document_id || documentId)
    .order('version', { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentVaultFile[];
};
