import { supabase } from '../../lib/supabase';

export interface DocumentIntelligenceDashboardSummary {
  unresolvedNotices: number;
  processingBacklog: number;
  extractionFailures: number;
  overdueDocumentWorkflows: number;
  highRiskComplianceDocuments: number;
}

export const getDocumentIntelligenceDashboardSummary = async (firmId: string): Promise<DocumentIntelligenceDashboardSummary> => {
  const [documentsRes, noticesRes] = await Promise.all([
    supabase
      .from('document_vault')
      .select('id, category, document_type, tags, linked_notice_id, created_at')
      .eq('firm_id', firmId)
      .eq('is_deleted', false),
    supabase
      .from('notices')
      .select('id, status, deadline')
      .eq('firm_id', firmId),
  ]);

  if (documentsRes.error) throw documentsRes.error;
  if (noticesRes.error) throw noticesRes.error;

  const documents = documentsRes.data || [];
  const notices = noticesRes.data || [];
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

