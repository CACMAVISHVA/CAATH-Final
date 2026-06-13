/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { writeDocumentAudit } from './documentAuditService';

export const linkDocument = async (
  documentId: string,
  linkType: 'task' | 'compliance' | 'invoice' | 'notice' | 'approval',
  linkId: string,
  user: { id: string; name: string; role: string },
  firmId: string
) => {
  const linkField = `linked_${linkType}_id`;
  const { error } = await supabase
    .from('document_vault')
    .update({
      [linkField]: linkId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    action: 'uploaded',
    details: `Linked to ${linkType}: ${linkId}`,
  });
};

export const unlinkDocument = async (
  documentId: string,
  linkType: 'task' | 'compliance' | 'invoice' | 'notice' | 'approval',
  user: { id: string; name: string; role: string },
  firmId: string
) => {
  const linkField = `linked_${linkType}_id`;
  const { error } = await supabase
    .from('document_vault')
    .update({
      [linkField]: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) throw error;

  await writeDocumentAudit({
    firmId,
    user,
    documentId,
    action: 'uploaded',
    details: `Unlinked from ${linkType}`,
  });
};
