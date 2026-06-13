/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Activity,
  ClipboardCheck,
  Building2,
  FileText,
  Bell,
  CheckSquare,
  CreditCard,
  Users,
  Clock,
  ExternalLink,
  LucideIcon,
} from 'lucide-react';

export type ProfileTab = 
  | 'overview' 
  | 'gst' 
  | 'mca' 
  | 'documents' 
  | 'notices' 
  | 'tasks' 
  | 'billing' 
  | 'staff' 
  | 'compliance' 
  | 'portal' 
  | 'timeline';

export interface TabConfig {
  id: ProfileTab;
  label: string;
  icon: LucideIcon;
}

export const PROFILE_TABS: readonly TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'gst', label: 'GST', icon: ClipboardCheck },
  { id: 'mca', label: 'MCA', icon: Building2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'notices', label: 'Notices', icon: Bell },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'staff', label: 'Staff Allocation', icon: Users },
  { id: 'compliance', label: 'Compliance Timeline', icon: ClipboardCheck },
  { id: 'portal', label: 'Portal', icon: ExternalLink },
  { id: 'timeline', label: 'Activity History', icon: Clock },
];

export const RISK_COLORS = {
  Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  High: 'bg-red-500/10 text-red-400 border-red-500/20',
} as const;
