/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  CheckSquare, 
  FileText, 
  Bell, 
  CreditCard, 
  Settings, 
  Calendar,
  ShieldAlert,
  Briefcase
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Client Master', icon: Users },
  { id: 'compliance', label: 'Compliance Tracker', icon: ClipboardCheck },
  { id: 'tasks', label: 'Tasks & Workflows', icon: CheckSquare },
  { id: 'notices', label: 'Notice Center', icon: Bell },
  { id: 'documents', label: 'Document Vault', icon: FileText },
  { id: 'billing', label: 'Billing & Revenue', icon: CreditCard },
  { id: 'staff', label: 'Staff Management', icon: Briefcase },
  { id: 'calendar', label: 'Master Calendar', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const CLIENT_TYPES = ['Individual', 'Firm', 'Company', 'Trust', 'HUF'];
export const RISK_LEVELS = ['Low', 'Medium', 'High'];
export const COMPLIANCE_CATEGORIES = ['GST', 'Income Tax', 'ROC', 'Audit', 'Custom'];
export const TASK_STATUSES = ['Todo', 'In Progress', 'Review', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const NOTICE_STATUSES = ['Received', 'Assigned', 'Drafted', 'Filed', 'Closed'];
export const BILLING_STATUSES = ['Paid', 'Unpaid', 'Overdue'];

export const COLORS = {
  urgent: '#ef4444', // Red-500
  upcoming: '#f59e0b', // Amber-500
  completed: '#10b981', // Emerald-500
  pending: '#3b82f6', // Blue-500
  neutral: '#64748b', // Slate-500
};
