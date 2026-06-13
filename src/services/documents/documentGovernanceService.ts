import { User } from '../../types';
import { getDocumentAuditTrail } from './documentAuditService';
import { getDocument } from './documentCoreService';

export interface DocumentGovernanceSnapshot {
  documentId: string;
  uploadedBy: string | null;
  reviewedBy: string | null;
  workflowLinks: {
    taskId: string | null;
    noticeId: string | null;
    invoiceId: string | null;
    approvalId: string | null;
    complianceId: string | null;
  };
  clientId: string | null;
  auditEntries: number;
}

export const canAccessDocument = (user: User, document: { firm_id: string; client_id: string | null; uploaded_by: string }): boolean => {
  if (user.role === 'GodAdmin') return true;
  if (user.role === 'SuperAdmin' || user.role === 'Admin') return user.firmId === document.firm_id;
  if (user.role === 'Staff') return user.firmId === document.firm_id;
  if (user.role === 'Client') return Boolean(document.client_id) && user.firmId === document.firm_id;
  return false;
};

export const getDocumentGovernanceSnapshot = async (documentId: string): Promise<DocumentGovernanceSnapshot | null> => {
  const doc = await getDocument(documentId);
  if (!doc) return null;
  const audit = await getDocumentAuditTrail(documentId);

  const reviewEntry = audit.find((entry: any) =>
    String(entry.action || '').toLowerCase().includes('review') ||
    String(entry.action || '').toLowerCase().includes('approved')
  );

  return {
    documentId: doc.id,
    uploadedBy: doc.uploaded_by || null,
    reviewedBy: reviewEntry?.user_id || null,
    workflowLinks: {
      taskId: doc.linked_task_id,
      noticeId: doc.linked_notice_id,
      invoiceId: doc.linked_invoice_id,
      approvalId: doc.linked_approval_id,
      complianceId: doc.linked_compliance_id,
    },
    clientId: doc.client_id,
    auditEntries: audit.length,
  };
};

