import { supabase } from '../../lib/supabase';

export interface DocumentIntelligenceDashboardSummary {
  unresolvedNotices: number;
  processingBacklog: number;
  extractionFailures: number;
  overdueDocumentWorkflows: number;
  highRiskComplianceDocuments: number;
}

const emptyDocumentSummary: DocumentIntelligenceDashboardSummary = {
  unresolvedNotices: 0,
  processingBacklog: 0,
  extractionFailures: 0,
  overdueDocumentWorkflows: 0,
  highRiskComplianceDocuments: 0,
};

export const getDocumentIntelligenceDashboardSummary = async (firmId: string): Promise<DocumentIntelligenceDashboardSummary> => {
  const [documentsRes, noticesRes] = await Promise.allSettled([
    supabase
      .from('document_vault')
      .select('id, category, document_type, tags, linked_notice_id, created_at')
      .eq('firm_id', firmId)
      .eq('is_deleted', false),
    supabase
      .from('notices')
      .select('id, status, deadline')
      .eq('firm_id', firmId),
  ] as const);

  const documents = documentsRes.status === 'fulfilled' && !documentsRes.value.error
    ? documentsRes.value.data || []
    : (console.warn('[AUTH] Optional document intelligence module unavailable: document_vault', documentsRes.status === 'rejected' ? documentsRes.reason : documentsRes.value.error), []);
  const notices = noticesRes.status === 'fulfilled' && !noticesRes.value.error
    ? noticesRes.value.data || []
    : (console.warn('[AUTH] Optional document intelligence module unavailable: notices', noticesRes.status === 'rejected' ? noticesRes.reason : noticesRes.value.error), []);

  if (!documents.length && !notices.length) return emptyDocumentSummary;

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const unresolvedNotices = notices.filter((n) => !['Filed', 'Closed', 'Archived'].includes(n.status || '')).length;
  const extractionFailures = documents.filter((d) => (d.tags || []).includes('extraction_failed')).length;
  const processingBacklog = documents.filter((d) =>
    (d.category === 'Notices' || (d.document_type || '').includes('Notice')) &&
    !d.linked_notice_id &&
    new Date(d.created_at) <= fiveDaysAgo
  ).length;
  const overdueDocumentWorkflows = notices.filter((n) =>
    n.deadline && new Date(n.deadline) < now && !['Filed', 'Closed', 'Archived'].includes(n.status || '')
  ).length;
  const highRiskComplianceDocuments = documents.filter((d) =>
    (d.tags || []).some((tag: string) => ['high_risk_document', 'deadline_overdue', 'official_notice'].includes(tag))
  ).length;

  return {
    unresolvedNotices,
    processingBacklog,
    extractionFailures,
    overdueDocumentWorkflows,
    highRiskComplianceDocuments,
  };
};
