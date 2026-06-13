import { DocumentCategory, DocumentType, DocumentVaultFile } from './documentTypes';

export interface DocumentClassificationResult {
  category: DocumentCategory;
  documentType: DocumentType;
  confidence: 'high' | 'medium' | 'low';
  matchedSignals: string[];
}

const classifyFromSignals = (source: string): { category: DocumentCategory; documentType: DocumentType; signals: string[] } => {
  const signals: string[] = [];
  const text = source.toLowerCase();

  if (text.includes('gstr-1') || text.includes('gstr1')) return { category: 'GST', documentType: 'GSTR-1', signals: ['gstr1'] };
  if (text.includes('gstr-3b') || text.includes('gstr3b')) return { category: 'GST', documentType: 'GSTR-3B', signals: ['gstr3b'] };
  if (text.includes('gstr-2a') || text.includes('gstr2a') || text.includes('gstr-2b') || text.includes('gstr2b')) return { category: 'GST', documentType: 'GSTR-2A', signals: ['gstr2x'] };

  if (text.includes('gst notice')) return { category: 'Notices', documentType: 'GST Notice', signals: ['gst_notice'] };
  if (text.includes('it notice') || text.includes('income tax notice')) return { category: 'Notices', documentType: 'IT Notice', signals: ['it_notice'] };
  if (text.includes('mca notice') || text.includes('roc notice')) return { category: 'Notices', documentType: 'MCA Notice', signals: ['mca_notice'] };

  if (text.includes('invoice') || text.includes('tax invoice')) return { category: 'Financial', documentType: 'Invoice', signals: ['invoice'] };
  if (text.includes('bank statement')) return { category: 'Financial', documentType: 'Bank Statement', signals: ['bank_statement'] };
  if (text.includes('salary') || text.includes('payroll')) return { category: 'Payroll', documentType: 'Payroll Record', signals: ['payroll'] };

  if (text.includes('agreement')) return { category: 'Agreements', documentType: 'Agreement', signals: ['agreement'] };
  if (text.includes('engagement letter')) return { category: 'Agreements', documentType: 'Engagement Letter', signals: ['engagement_letter'] };
  if (text.includes('audit') && text.includes('working')) return { category: 'Audit', documentType: 'Audit Working Paper', signals: ['audit_working_paper'] };
  if (text.includes('audit report')) return { category: 'Audit', documentType: 'Audit Report', signals: ['audit_report'] };

  if (text.includes('roc filing') || text.includes('mca filing')) return { category: 'ROC', documentType: 'ROC Filing', signals: ['roc_filing'] };
  if (text.includes('itr')) return { category: 'Income Tax', documentType: 'ITR', signals: ['itr'] };
  if (text.includes('challan')) return { category: 'Income Tax', documentType: 'Challan', signals: ['challan'] };
  if (text.includes('notice')) return { category: 'Notices', documentType: 'Notice', signals: ['notice_generic'] };

  signals.push('fallback');
  return { category: 'Other', documentType: 'Other', signals };
};

export const classifyDocument = (document: Pick<DocumentVaultFile, 'name' | 'category' | 'document_type' | 'mime_type' | 'tags'>): DocumentClassificationResult => {
  const source = `${document.name} ${document.category} ${document.document_type} ${document.mime_type || ''} ${(document.tags || []).join(' ')}`;
  const inferred = classifyFromSignals(source);
  const confidence: 'high' | 'medium' | 'low' =
    inferred.signals.includes('fallback') ? 'low' : inferred.signals.length >= 1 ? 'high' : 'medium';

  if (inferred.category === 'Other' && document.category !== 'Other') {
    return {
      category: document.category,
      documentType: document.document_type,
      confidence: 'low',
      matchedSignals: ['fallback_existing_classification'],
    };
  }

  return {
    category: inferred.category,
    documentType: inferred.documentType,
    confidence,
    matchedSignals: inferred.signals,
  };
};
