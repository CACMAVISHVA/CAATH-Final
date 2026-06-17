/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from '../types';

export const ALL_ROLES: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff', 'Client'];

export const ROLE_HOME: Record<UserRole, string> = {
  GodAdmin: 'platform',
  SuperAdmin: 'workspace',
  Admin: 'workspace',
  Staff: 'workspace',
  Client: 'overview',
};

export const ROLE_ACCESS: Record<UserRole, string[]> = {
  GodAdmin: [
    'platform',
    'firms',
    'provisioning',
    'subscriptions',
    'platform-audit',
    'usage',
    'system-notices',
    'settings',
    'subscription',
  ],
  SuperAdmin: [
    'workspace',
    'analytics',
    'ai-copilot',
    'learning',
    'governance',
    'autonomous',
    'integrations',
    'collaboration',
    'eox',
    'dashboard',
    'clients',
    'compliance',
    'gst',
    'portal-gst',
    'portal-income-tax',
    'portal-mca',
    'portal-traces',
    'tasks',
    'documents',
    'approvals',
    'notices',
    'automation',
    'notifications',
    'ai',
    'payroll',
    'billing',
    'user-management',
    'workspace-settings',
    'firm-profile',
    'login-activity',
    'staff',
    'auditlog',
    'security',
    'qa',
  ],
  Admin: [
    'workspace',
    'analytics',
    'ai-copilot',
    'learning',
    'governance',
    'autonomous',
    'integrations',
    'collaboration',
    'eox',
    'dashboard',
    'clients',
    'compliance',
    'gst',
    'portal-gst',
    'portal-income-tax',
    'portal-mca',
    'portal-traces',
    'tasks',
    'documents',
    'approvals',
    'notices',
    'automation',
    'notifications',
    'ai',
    'payroll',
    'billing',
    'user-management',
    'login-activity',
    'auditlog',
    'qa',
  ],
  Staff: [
    'workspace',
    'analytics',
    'ai-copilot',
    'learning',
    'governance',
    'collaboration',
    'eox',
    'tasks',
    'clients',
    'compliance',
    'gst',
    'portal-gst',
    'portal-income-tax',
    'portal-mca',
    'portal-traces',
    'documents',
    'notices',
    'notifications',
    'payroll',
    'billing',
  ],
  Client: ['overview', 'documents', 'messages', 'compliance'],
};

export type PermissionSet = {
  reviewDocuments: boolean;
  approveDocuments: boolean;
  managePlatform: boolean;
  deleteClient: boolean;
  viewBilling: boolean;
  manageStaff: boolean;
  editProfile: boolean;
  requestProfileChanges: boolean;
  viewSubscriptionDetails: boolean;
  manageAutomation: boolean;
};

export const isUserRole = (role: string | null | undefined): role is UserRole =>
  role === 'GodAdmin' || role === 'SuperAdmin' || role === 'Admin' || role === 'Staff' || role === 'Client';

export const canManagePlatform = (user: User | null | undefined) => user?.role === 'GodAdmin';

export const canApproveDocuments = (user: User | null | undefined) =>
  user?.role === 'GodAdmin' || user?.role === 'SuperAdmin';

export const canReviewDocuments = (user: User | null | undefined) =>
  user?.role === 'GodAdmin' || user?.role === 'SuperAdmin' || user?.role === 'Admin';

export const canApproveOrReject = (user: User | null | undefined) =>
  user?.role === 'GodAdmin' || user?.role === 'SuperAdmin' || user?.role === 'Admin';

export const canDeleteClient = (user: User | null | undefined) => user?.role === 'SuperAdmin' || user?.role === 'Admin';

export const canViewBilling = (user: User | null | undefined) => user?.role === 'SuperAdmin';

export const canManageStaff = (user: User | null | undefined) => user?.role === 'SuperAdmin';

export const canEditProfile = (user: User | null | undefined) =>
  user?.role === 'GodAdmin' || user?.role === 'SuperAdmin';

export const canSubmitProfileRequest = (user: User | null | undefined) =>
  user?.role === 'Admin' || user?.role === 'Staff';

export const canViewSubscriptionDetails = (user: User | null | undefined) =>
  user?.role === 'GodAdmin' || user?.role === 'SuperAdmin';

export const canManageAutomation = (user: User | null | undefined) =>
  user?.role === 'GodAdmin' || user?.role === 'SuperAdmin' || user?.role === 'Admin';

export const getPermissions = (user: User | null | undefined): PermissionSet => ({
  reviewDocuments: canReviewDocuments(user),
  approveDocuments: canApproveDocuments(user),
  managePlatform: canManagePlatform(user),
  deleteClient: canDeleteClient(user),
  viewBilling: canViewBilling(user),
  manageStaff: canManageStaff(user),
  editProfile: canEditProfile(user),
  requestProfileChanges: canSubmitProfileRequest(user),
  viewSubscriptionDetails: canViewSubscriptionDetails(user),
  manageAutomation: canManageAutomation(user),
});

export const canAccessTab = (user: User | null | undefined, tab: string) =>
  Boolean(user && ROLE_ACCESS[user.role]?.includes(tab));
