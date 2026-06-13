import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { publishEnterpriseEvent } from '../enterpriseEventBusService';
import { registerOrchestrationChain } from '../enterpriseOrchestrationService';
import { createNotice, NoticeSource } from '../noticeService';
import { classifyDocument } from './documentClassificationService';
import { extractDocumentMetadata } from './documentExtractionService';
import { buildDocumentKnowledgeSnapshot } from './documentKnowledgeMemoryService';
import { DocumentVaultFile } from './documentTypes';

const mapCategoryToNoticeSource = (category: string, documentType: string): NoticeSource | null => {
  const value = `${category} ${documentType}`.toLowerCase();
  if (value.includes('gst')) return 'GST';
  if (value.includes('income tax') || value.includes('itr') || value.includes('assessment')) return 'Income Tax';
  if (value.includes('roc') || value.includes('mca')) return 'MCA';
  if (value.includes('notice')) return 'Other';
  return null;
};

const safeAuditLog = async (params: {
  firmId: string;
  user: User;
  action: string;
  entityId: string;
  details: string;
}) => {
  await supabase.from('audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: 'DocumentIntelligence',
    entity_id: params.entityId,
    details: params.details,
  }]);
};

export const orchestrateDocumentIntelligence = async (document: DocumentVaultFile, user: User, firmId: string) => {
  const classification = classifyDocument(document);
  const extracted = await extractDocumentMetadata(document);
  const normalizedCategory = classification.category;
  const normalizedType = classification.documentType;
  const intelligenceTags = Array.from(new Set([
    ...(document.tags || []),
    `classification:${normalizedCategory}`,
    `type:${normalizedType}`,
    `confidence:${classification.confidence}`,
    ...extracted.riskIndicators,
    extracted.extractionStatus === 'failed' ? 'extraction_failed' : 'extraction_processed',
  ]));

  await supabase
    .from('document_vault')
    .update({
      tags: intelligenceTags,
      category: normalizedCategory,
      document_type: normalizedType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', document.id);

  await publishEnterpriseEvent({
    eventName: 'document_classified',
    firmId,
    sourceService: 'documentClassificationService.classifyDocument',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'document_vault',
    workflowId: document.id,
    payload: {
      category: normalizedCategory,
      documentType: normalizedType,
      confidence: classification.confidence,
      matchedSignals: classification.matchedSignals,
    },
  });

  await publishEnterpriseEvent({
    eventName: 'document_uploaded',
    firmId,
    sourceService: 'documentIntelligenceOrchestrationService.orchestrateDocumentIntelligence',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'document_vault',
    workflowId: document.id,
    payload: {
      documentType: normalizedType,
      category: normalizedCategory,
      clientId: document.client_id,
    },
  });
  try {
    await registerOrchestrationChain({
      firmId,
      actor: user,
      chainType: 'document_to_notice',
      entityType: 'document_vault',
      entityId: document.id,
      governanceRequired: false,
    });
  } catch {
    // keep document orchestration path stable
  }

  await publishEnterpriseEvent({
    eventName: 'extraction_completed',
    firmId,
    sourceService: 'documentExtractionService.extractDocumentMetadata',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'document_vault',
    workflowId: document.id,
    payload: {
      extractionStatus: extracted.extractionStatus,
      extractionIssues: extracted.extractionIssues,
      riskIndicators: extracted.riskIndicators,
      noticeNumber: extracted.noticeNumber,
      deadline: extracted.deadline,
      entityReferences: extracted.entityReferences,
      departmentSource: extracted.departmentSource,
      financialAmount: extracted.financialAmount,
    },
  });

  await safeAuditLog({
    firmId,
    user,
    action: 'Document Extraction Completed',
    entityId: document.id,
    details: `Extraction status: ${extracted.extractionStatus}. Issues: ${extracted.extractionIssues.join(', ') || 'none'}.`,
  });

  const looksLikeNotice = normalizedCategory === 'Notices' || normalizedType.includes('Notice');
  const looksLikeFinancial = normalizedCategory === 'Financial' || normalizedType === 'Invoice' || normalizedType === 'Bank Statement';

  if (looksLikeFinancial) {
    await publishEnterpriseEvent({
      eventName: 'finance_continuity_prepared',
      firmId,
      sourceService: 'documentIntelligenceOrchestrationService.financeBridge',
      actor: { id: user.id, name: user.name, role: user.role },
      workflowType: 'document_vault',
      workflowId: document.id,
      payload: {
        documentType: normalizedType,
        amount: extracted.financialAmount,
        linkedInvoiceId: document.linked_invoice_id,
        receivableReadiness: normalizedType === 'Invoice' ? 'ready' : 'needs_mapping',
      },
    });
  }

  const knowledgeSnapshot = buildDocumentKnowledgeSnapshot({
    ...document,
    category: normalizedCategory,
    document_type: normalizedType,
  }, extracted);

  await publishEnterpriseEvent({
    eventName: 'document_knowledge_linked',
    firmId,
    sourceService: 'documentKnowledgeMemoryService.buildDocumentKnowledgeSnapshot',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'document_vault',
    workflowId: document.id,
    payload: {
      chainKey: knowledgeSnapshot.chainKey,
      linksCount: knowledgeSnapshot.links.length,
      riskTags: knowledgeSnapshot.riskTags,
      summary: knowledgeSnapshot.summary,
    },
  });

  await safeAuditLog({
    firmId,
    user,
    action: 'Document Knowledge Chain Updated',
    entityId: document.id,
    details: `Knowledge chain links: ${knowledgeSnapshot.links.length}.`,
  });

  if (!looksLikeNotice || !document.client_id) {
    return { extracted, workflowCreated: false, noticeId: null as string | null };
  }

  const noticeSource = mapCategoryToNoticeSource(document.category, document.document_type);
  if (!noticeSource) {
    return { extracted, workflowCreated: false, noticeId: null as string | null };
  }

  await publishEnterpriseEvent({
    eventName: 'notice_identified',
    firmId,
    sourceService: 'documentIntelligenceOrchestrationService.noticeDetection',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'document_vault',
    workflowId: document.id,
    payload: {
      source: noticeSource,
      noticeNumber: extracted.noticeNumber,
      riskIndicators: extracted.riskIndicators,
    },
  });

  const notice = await createNotice({
    firmId,
    clientId: document.client_id,
    source: noticeSource,
    noticeNumber: extracted.noticeNumber || document.name,
    description: `Auto-created from document intelligence: ${document.name}`,
    receivedDate: new Date().toISOString().split('T')[0],
    deadline: extracted.deadline || undefined,
    assignedTo: undefined,
    user,
  });

  await supabase
    .from('document_vault')
    .update({
      linked_notice_id: notice.id,
      tags: Array.from(new Set([...(document.tags || []), 'workflow_intelligence', 'notice_identified'])),
      updated_at: new Date().toISOString(),
    })
    .eq('id', document.id);

  await publishEnterpriseEvent({
    eventName: 'workflow_created_from_document',
    firmId,
    sourceService: 'documentIntelligenceOrchestrationService.workflowBridge',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'notices',
    workflowId: notice.id,
    payload: {
      documentId: document.id,
      source: noticeSource,
      noticeNumber: extracted.noticeNumber,
      deadline: extracted.deadline,
    },
  });

  await safeAuditLog({
    firmId,
    user,
    action: 'Workflow Created From Document',
    entityId: document.id,
    details: `Created notice workflow ${notice.id} from document ${document.name}.`,
  });

  return { extracted, workflowCreated: true, noticeId: notice.id as string };
};
