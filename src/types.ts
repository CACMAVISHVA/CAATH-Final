/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ClientType = 'Individual' | 'Firm' | 'Company' | 'Trust' | 'HUF';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ComplianceStatus = 'Pending' | 'Filed' | 'Late' | 'Upcoming';
export type TaskStatus = 'Todo' | 'In Progress' | 'Review' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type NoticeStatus = 'Received' | 'Assigned' | 'Drafted' | 'Filed' | 'Closed';
export type BillingStatus = 'Paid' | 'Unpaid' | 'Overdue';
export type DocumentStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REWORK' | 'CLIENT_VISIBLE';
export type DocumentWorkflowStage = 'DRAFT' | 'STAFF_PROCESSED' | 'ADMIN_REVIEW' | 'SUPERADMIN_APPROVAL' | 'CLIENT_VISIBLE' | 'ARCHIVED' | 'REJECTED' | 'REWORK';

export type UserRole = 'GodAdmin' | 'SuperAdmin' | 'Admin' | 'Staff' | 'Client';
export type SubscriptionStatus = 'Trial' | 'Active' | 'Pending Payment' | 'Pending Subscription' | 'Expired' | 'Suspended' | 'Cancelled';
export type WorkspaceSubscriptionPlan = 'Starter' | 'Professional' | 'Enterprise';

export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REWORK' | 'CLIENT_VISIBLE' | 'ARCHIVED';
export type ApprovalWorkflowStage = 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REWORK' | 'CLIENT_VISIBLE' | 'ARCHIVED';

export interface User {
  id: string;
  authId?: string;
  email: string;
  name: string;
  role: UserRole;
  status?: string;
  firmId?: string;
  isWorkspaceOwner?: boolean;
  firm?: WorkspaceFirm;
  createdAt?: string;
  assignedClients?: string[];
  services?: ('GST' | 'Income Tax' | 'MCA')[];
  performance?: {
    tasksCompleted: number;
    documentsDelivered: number;
    avgTurnaroundDays: number;
    clientSatisfaction: number;
  };
}

export interface WorkspaceFirm {
  id: string;
  name: string;
  workspaceCode?: string;
  subscriptionPlan: WorkspaceSubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  maxAdmins: number;
  maxStaff: number;
  maxClients: number;
  createdByAuthId?: string;
  createdAt?: string;
}

export interface Firm {
  id: string;
  name: string;
  ownerUserId: string;
  ownerEmail: string;
  status: 'Active' | 'Blocked';
  subscriptionType: 'Monthly' | 'Yearly';
  subscriptionStartDate: string;
  subscriptionExpiryDate: string;
  totalClients: number;
  totalStaff: number;
  revenueGenerated: number;
}

export interface Client {
  id: string;
  firmId: string;
  name: string;
  type: ClientType;
  pan: string;
  gstin?: string;
  cin?: string;
  aadhaar?: string;
  riskLevel: RiskLevel;
  tags: string[];
  contactPerson: string;
  email: string;
  phone: string;
  assignedStaffId?: string;
  services: ('GST' | 'Income Tax' | 'MCA')[];
}

export interface ComplianceType {
  id: string;
  name: string;
  category: 'GST' | 'Income Tax' | 'ROC' | 'Audit' | 'Custom';
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
  dueDateRule: string; // e.g., "11th of next month"
}

export interface Filing {
  id: string;
  clientId: string;
  complianceTypeId: string;
  dueDate: string;
  status: ComplianceStatus;
  filedDate?: string;
  penaltyAmount?: number;
  assignedTo?: string;
}

export interface Task {
  id: string;
  firmId: string;
  clientId?: string;
  assignedTo: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  status: TaskStatus;
  category: string;
}

export interface Notice {
  id: string;
  clientId: string;
  source: 'Income Tax' | 'GST' | 'MCA';
  receivedDate: string;
  deadline: string;
  status: NoticeStatus;
  assignedTo: string;
  replyDraft?: string;
  noticeNumber: string;
}

export interface Subscription {
  id: string;
  firmId: string;
  status: 'Active' | 'Inactive' | 'Trial';
  plan: 'Basic' | 'Pro' | 'Enterprise';
  nextBillingDate: string;
  amount: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: string[];
}

export interface ExtractedData {
  id: string;
  documentId: string;
  type: 'Invoice' | 'Receipt' | 'Bank Statement';
  vendor?: string;
  date?: string;
  amount?: number;
  taxAmount?: number;
  currency?: string;
  confidence: number;
  category: string;
}

// GST / Reconciliation types
export type GstInvoiceSource = 'GSTR1' | 'GSTR3B' | 'PURCHASE' | 'B2B' | 'B2BA';

export interface GstInvoice {
  id: string;
  firmId: string;
  clientId: string;
  invoiceNo: string;
  invoiceDate: string;
  supplierGstin?: string;
  recipientGstin?: string;
  taxableValue: number;
  taxAmount: number;
  totalAmount: number;
  type: 'OUTWARD' | 'INWARD';
  source: GstInvoiceSource;
  originalPayload?: any;
  importedAt?: string;
}

export interface GstReconciliationSummary {
  clientId: string;
  period: string; // e.g., '2026-04'
  totalOutward: number;
  totalOutwardTax: number;
  totalInward: number;
  totalInwardTax: number;
  mismatchCount: number;
  pendingIssues: number;
  reconciliationHealthScore?: number;
  filingConsistencyScore?: number;
  outwardLiabilityVariance?: number;
  noticeRiskCategory?: 'Low' | 'Medium' | 'High';
  mismatchSeverity?: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface GstMismatch {
  id: string;
  reconciliationId: string;
  invoiceId?: string;
  invoiceNo?: string;
  gstin?: string;
  mismatchType: 'AMOUNT_MISMATCH' | 'MISSING_IN_GSTR3B' | 'MISSING_IN_GSTR1' | 'TAX_VARIANCE' | 'OTHER';
  details: any;
  createdAt: string;
}

export interface Document {
  id: string;
  firmId?: string;
  clientId: string;
  name: string;
  url: string;
  category: string;
  version: number;
  uploadedBy: string;
  timestamp: string;
  status?: DocumentStatus;
  workflowStage?: DocumentWorkflowStage;
  visibleToClient?: boolean;
  adminReviewedBy?: string;
  adminReviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  extractedData?: ExtractedData;
}

export interface Billing {
  id: string;
  clientId: string;
  amount: number;
  type: 'Retainer' | 'One-time';
  status: BillingStatus;
  date: string;
  invoiceNumber: string;
}

export interface AuditLog {
  id: string;
  firmId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'Login' | 'Client' | 'Task' | 'Document' | 'System' | 'Approval' | 'Billing' | 'Notice' | 'Compliance';
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface Approval {
  id: string;
  firmId: string;
  module: string;
  recordId: string;
  status: ApprovalStatus;
  workflowStage: ApprovalWorkflowStage;
  assignedTo?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  reworkOwner?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceProfile {
  id: string;
  firmId: string;
  userId: string;
  employeeCode: string;
  department: string;
  team: string;
  designation: string;
  joiningDate: string;
  reportingManagerId?: string;
  compensationStatus: 'Draft' | 'Active' | 'Paused';
}

export interface SalaryStructure {
  id: string;
  firmId: string;
  employeeUserId: string;
  baseSalary: number;
  incentives: number;
  bonus: number;
  deductions: number;
  reimbursements: number;
  effectiveFrom: string;
  status: 'Active' | 'Inactive';
}

export interface PayrollRecord {
  id: string;
  firmId: string;
  payrollPeriod: string;
  employeeUserId: string;
  grossAmount: number;
  netAmount: number;
  payoutStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Rejected';
  approvedBy?: string;
  approvedAt?: string;
}
