/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { getDocument } from './documentCoreService';
import { writeDocumentAudit } from './documentAuditService';

export const archiveDocument = async (documentId: string, user: { id: string; name: string; role: string }, firmId: string, clientId?: string) => {
  const { error } = await supabase
    .from('document_vault')
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    clientId,
    action: 'archived',
    details: 'Document archived',
  });
};

export const restoreDocument = async (documentId: string, user: { id: string; name: string; role: string }, firmId: string, clientId?: string) => {
  const { error } = await supabase
    .from('document_vault')
    .update({
      is_archived: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    clientId,
    action: 'restored',
    details: 'Document restored from archive',
  });
};

export const softDeleteDocument = async (documentId: string, user: { id: string; name: string; role: string }, firmId: string, clientId?: string) => {
  const { error } = await supabase
    .from('document_vault')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    clientId,
    action: 'deleted',
    details: 'Document moved to trash',
  });
};

export const permanentDeleteDocument = async (documentId: string) => {
  // Get file path first
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Document not found');

  // Delete from storage
  const filePath = doc.file_path.split('/').slice(-3).join('/');
  await supabase.storage.from('documents').remove([filePath]);

  // Delete record
  const { error } = await supabase
    .from('document_vault')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
};

export const restoreDocumentFromTrash = async (documentId: string, user: { id: string; name: string; role: string }, firmId: string, clientId?: string) => {
  const { error } = await supabase
    .from('document_vault')
    .update({
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    clientId,
    action: 'restored',
    details: 'Document restored from trash',
  });
};
