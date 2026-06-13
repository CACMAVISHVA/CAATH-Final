/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { DocumentCategory, DocumentVaultFile } from './documentTypes';
import { getDocuments } from './documentCoreService';

export const getClientDocumentCounts = async (clientId: string): Promise<Record<DocumentCategory, number>> => {
  const { data, error } = await supabase
    .from('document_vault')
    .select('category')
    .eq('client_id', clientId)
    .eq('is_deleted', false);

  if (error) throw error;

  const counts: Record<string, number> = {};
  data?.forEach(doc => {
    counts[doc.category] = (counts[doc.category] || 0) + 1;
  });

  return counts as Record<DocumentCategory, number>;
};

export const getExpiringDocuments = async (firmId: string, daysAhead = 30) => {
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const { data, error } = await supabase
    .from('document_vault')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_deleted', false)
    .not('expires_at', 'is', null)
    .lte('expires_at', future.toISOString())
    .order('expires_at', { ascending: true });
  if (error) throw error;
  return (data || []) as DocumentVaultFile[];
};

export const getStorageAnalytics = async (firmId: string) => {
  const documents = await getDocuments({ firmId, includeArchived: true, limit: 500 });
  const totalBytes = documents.reduce((sum, document) => sum + document.file_size, 0);
  const byCategory = documents.reduce((acc, document) => {
    acc[document.category] = (acc[document.category] || 0) + document.file_size;
    return acc;
  }, {} as Record<string, number>);
  return { totalBytes, byCategory, totalDocuments: documents.length };
};
