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

export type UserRole = 'GodAdmin' | 'SuperAdmin' | 'Admin' | 'Staff' | 'Client';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  firmId?: string; // GodAdmin might not have a firmId
  assignedClients?: string[];
  performance?: {
    tasksCompleted: number;
    documentsDelivered: number;
    avgTurnaroundDays: number;
    clientSatisfaction: number;
  };
}

export interface Firm {
  id: string;
  name: string;
  ownerUid: string;
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

export interface Document {
  id: string;
  clientId: string;
  name: string;
  url: string;
  category: string;
  version: number;
  uploadedBy: string;
  timestamp: string;
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
  firmId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'Login' | 'Client' | 'Task' | 'Document' | 'System';
  details: string;
  timestamp: string;
  ipAddress?: string;
}
