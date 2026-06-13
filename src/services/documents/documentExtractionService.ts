import { supabase } from '../../lib/supabase';
import { DocumentCategory, DocumentType, DocumentVaultFile } from './documentTypes';

export interface ExtractedDocumentMetadata {
  noticeNumber: string | null;
  clientIdentity: string | null;
  gstin: string | null;
  pan: string | null;
  departmentSource: string | null;
  filingPeriod: string | null;
  deadline: string | null;
  extractedDate: string | null;
  financialAmount: number | null;
  entityReferences: string[];
  riskIndicators: string[];
  extractionStatus: 'success' | 'partial' | 'failed';
  extractionIssues: string[];
}

const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b/i;
const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]{1}\b/i;
const NOTICE_REGEX = /\b(?:NOTICE|NTC|REF|ORDER)[-_ ]?([A-Z0-9/-]{4,})\b/i;
const PERIOD_REGEX = /\b(20\d{2}[-/](?:0[1-9]|1[0-2]))\b/;
const DATE_REGEX = /\b(20\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01]))\b/;
const AMOUNT_REGEX = /\b(?:rs\.?|inr)?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/i;
const REF_REGEX = /\b(?:inv|invoice|doc|ref|ack|arn|order)[-_:\s]?([a-z0-9/-]{4,})\b/i;

const detectDepartment = (value: string, category: DocumentCategory, documentType: DocumentType): string | null => {
  const text = value.toLowerCase();
  if (text.includes('gst') || category === 'GST') return 'GST';
  if (text.includes('income tax') || text.includes('itr') || category === 'Income Tax') return 'Income Tax';
  if (text.includes('mca') || text.includes('roc') || category === 'ROC') return 'MCA';
  if (text.includes('payroll') || category === 'Payroll') return 'Payroll';
  if (text.includes('bank') || text.includes('statement')) return 'Banking';
  if (text.includes('invoice') || category === 'Financial') return 'Billing';
  if (category === 'Audit') return 'Audit';
  if (documentType.includes('Notice')) return 'Notice';
  return null;
};

export const extractDocumentMetadata = async (document: DocumentVaultFile): Promise<ExtractedDocumentMetadata> => {
  const sourceText = `${document.name} ${document.document_type} ${document.category} ${(document.tags || []).join(' ')}`;
  const gstin = sourceText.match(GSTIN_REGEX)?.[0] || null;
  const pan = sourceText.match(PAN_REGEX)?.[0] || null;
  const noticeNumber = sourceText.match(NOTICE_REGEX)?.[1] || null;
  const filingPeriod = sourceText.match(PERIOD_REGEX)?.[1] || null;
  const extractedDateRaw = sourceText.match(DATE_REGEX)?.[1] || null;
  const amountRaw = sourceText.match(AMOUNT_REGEX)?.[1] || null;
  const reference = sourceText.match(REF_REGEX)?.[1] || null;
  const financialAmount = amountRaw ? Number(String(amountRaw).replace(/,/g, '')) : null;
  const departmentSource = detectDepartment(sourceText, document.category, document.document_type);

  let clientIdentity: string | null = null;
  if (document.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', document.client_id)
      .maybeSingle();
    clientIdentity = client?.name || null;
  }

  const extractionIssues: string[] = [];
  if (!departmentSource) extractionIssues.push('department_source_missing');
  if (!gstin && !pan) extractionIssues.push('tax_identity_missing');
  if (!noticeNumber && (document.document_type.includes('Notice') || document.category === 'Notices')) extractionIssues.push('notice_number_missing');
  if (!reference && (document.document_type === 'Invoice' || document.category === 'Financial')) extractionIssues.push('entity_reference_missing');

  const riskIndicators: string[] = [];
  if (document.category === 'Notices') riskIndicators.push('compliance_notice');
  if (document.document_type.includes('Notice')) riskIndicators.push('official_notice');
  if (!extractedDateRaw && (document.category === 'Notices' || document.category === 'GST')) riskIndicators.push('deadline_not_detected');
  if (extractedDateRaw && new Date(extractedDateRaw).getTime() < Date.now()) riskIndicators.push('deadline_overdue');
  if (financialAmount && financialAmount >= 100000) riskIndicators.push('high_financial_impact');
  if (document.document_type === 'Invoice' && !financialAmount) riskIndicators.push('invoice_amount_missing');
  if (document.document_type.includes('Notice') && !filingPeriod) riskIndicators.push('period_not_detected');

  const extractionStatus: 'success' | 'partial' | 'failed' =
    extractionIssues.length === 0 ? 'success' : extractionIssues.length <= 2 ? 'partial' : 'failed';

  return {
    noticeNumber,
    clientIdentity,
    gstin,
    pan,
    departmentSource,
    filingPeriod,
    deadline: extractedDateRaw ? extractedDateRaw.replace(/\//g, '-') : null,
    extractedDate: extractedDateRaw ? extractedDateRaw.replace(/\//g, '-') : null,
    financialAmount,
    entityReferences: reference ? [reference] : [],
    riskIndicators,
    extractionStatus,
    extractionIssues,
  };
};
