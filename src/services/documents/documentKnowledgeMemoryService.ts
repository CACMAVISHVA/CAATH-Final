import { ExtractedDocumentMetadata } from './documentExtractionService';
import { DocumentVaultFile } from './documentTypes';

export interface DocumentKnowledgeLink {
  linkType: 'client' | 'task' | 'notice' | 'invoice' | 'approval' | 'compliance_reference';
  referenceId: string;
}

export interface DocumentKnowledgeSnapshot {
  chainKey: string;
  links: DocumentKnowledgeLink[];
  summary: string;
  riskTags: string[];
}

export const buildDocumentKnowledgeSnapshot = (
  document: DocumentVaultFile,
  extracted: ExtractedDocumentMetadata
): DocumentKnowledgeSnapshot => {
  const links: DocumentKnowledgeLink[] = [];
  if (document.client_id) links.push({ linkType: 'client', referenceId: document.client_id });
  if (document.linked_task_id) links.push({ linkType: 'task', referenceId: document.linked_task_id });
  if (document.linked_notice_id) links.push({ linkType: 'notice', referenceId: document.linked_notice_id });
  if (document.linked_invoice_id) links.push({ linkType: 'invoice', referenceId: document.linked_invoice_id });
  if (document.linked_approval_id) links.push({ linkType: 'approval', referenceId: document.linked_approval_id });
  extracted.entityReferences.forEach((ref) => links.push({ linkType: 'compliance_reference', referenceId: ref }));

  const summary = `Document ${document.name} linked across ${links.length} operational entities with ${extracted.riskIndicators.length} risk indicators.`;

  return {
    chainKey: `doc:${document.id}`,
    links,
    summary,
    riskTags: extracted.riskIndicators,
  };
};
