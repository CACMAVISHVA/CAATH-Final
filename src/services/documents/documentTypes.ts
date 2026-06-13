/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../../types';

export type DocumentCategory =
  | 'GST'
  | 'Income Tax'
  | 'ROC'
  | 'Audit'
  | 'Payroll'
  | 'Financial'
  | 'Agreements'
  | 'Certificates'
  | 'Notices'
  | 'Internal'
  | 'Other';

export type DocumentType =
  | 'GSTR-1'
  | 'GSTR-3B'
  | 'GSTR-2A'
  | 'GST Certificate'
  | 'GST Notice'
  | 'ITR'
  | 'Computation'
  | 'Assessment Order'
  | 'IT Notice'
  | 'Challan'
  | 'Incorporation Document'
  | 'ROC Filing'
  | 'MCA Notice'
  | 'Audit Report'
  | 'Working Paper'
  | 'Salary Sheet'
  | 'PF/ESI'
  | 'Payroll Record'
  | 'Engagement Letter'
  | 'Contract'
  | 'NDA'
  | 'Agreement'
  | 'Invoice'
  | 'Bank Statement'
  | 'Compliance Filing'
  | 'Audit Working Paper'
  | 'GST Return'
  | 'Certificate'
  | 'Notice'
  | 'Response'
  | 'Internal Note'
  | 'Reconciliation'
  | 'Resolution'
  | 'Confirmation'
  | 'Ledger'
  | 'Employee Document'
  | 'License'
  | 'Registration'
  | 'Order'
  | 'Strategy Document'
  | 'Meeting Notes'
  | 'Other';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'GST',
  'Income Tax',
  'ROC',
  'Audit',
  'Payroll',
  'Financial',
  'Agreements',
  'Certificates',
  'Notices',
  'Internal',
  'Other',
];

export const DOCUMENT_TYPES: Record<DocumentCategory, DocumentType[]> = {
  GST: ['GSTR-1', 'GSTR-3B', 'GSTR-2A', 'GST Certificate', 'GST Notice', 'GST Return', 'Compliance Filing'],
  'Income Tax': ['ITR', 'Computation', 'Assessment Order', 'IT Notice', 'Challan', 'Compliance Filing'],
  ROC: ['Incorporation Document', 'ROC Filing', 'MCA Notice'],
  Audit: ['Audit Report', 'Working Paper', 'Audit Working Paper'],
  Payroll: ['Salary Sheet', 'PF/ESI', 'Payroll Record'],
  Financial: ['Invoice', 'Bank Statement', 'Ledger', 'Confirmation'],
  Agreements: ['Engagement Letter', 'Contract', 'NDA', 'Agreement'],
  Certificates: ['Certificate'],
  Notices: ['Notice', 'Response'],
  Internal: ['Internal Note', 'Reconciliation', 'Resolution', 'Confirmation', 'Ledger', 'Employee Document', 'License', 'Registration', 'Order', 'Strategy Document', 'Meeting Notes'],
  Other: ['Other'],
};

export interface DocumentVaultFile {
  id: string;
  firm_id: string;
  client_id: string | null;
  category: DocumentCategory;
  document_type: DocumentType;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  // Task linking
  linked_task_id: string | null;
  // Compliance linking
  linked_compliance_id: string | null;
  // Invoice linking
  linked_invoice_id: string | null;
  // Notice linking
  linked_notice_id: string | null;
  // Approval linking
  linked_approval_id: string | null;
  // Document relations
  parent_document_id: string | null;
  version: number;
  is_archived: boolean;
  is_deleted: boolean;
  tags: string[];
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  expires_at?: string | null;
  ocr_status?: 'PENDING' | 'READY' | 'FAILED' | null;
}

export interface DocumentUploadInput {
  firmId: string;
  clientId: string;
  category: DocumentCategory;
  documentType: DocumentType;
  file: File;
  linkedTaskId?: string;
  linkedComplianceId?: string;
  linkedInvoiceId?: string;
  linkedNoticeId?: string;
  linkedApprovalId?: string;
  tags?: string[];
  user: User;
}

export interface DocumentSearchParams {
  firmId: string;
  query?: string;
  clientId?: string;
  category?: DocumentCategory;
  documentType?: DocumentType;
  uploadedBy?: string;
  linkedTaskId?: string;
  linkedNoticeId?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}
