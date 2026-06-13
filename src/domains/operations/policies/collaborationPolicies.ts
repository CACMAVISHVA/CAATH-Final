import { UserRole } from '../../../types';

export type CollaborationEntityType =
  | 'tasks'
  | 'notices'
  | 'workflows'
  | 'approvals'
  | 'invoices'
  | 'documents'
  | 'payroll_runs'
  | 'escalations';

export const resolveVisibilityRoles = (
  entityType: CollaborationEntityType,
  explicit?: UserRole[],
): UserRole[] => {
  if (explicit && explicit.length > 0) return explicit;
  if (entityType === 'payroll_runs') return ['SuperAdmin'];
  return ['SuperAdmin', 'Admin', 'Staff'];
};

const allowedForRole = (roles: UserRole[] | undefined, role: UserRole) => {
  if (!roles || roles.length === 0) return true;
  return roles.includes(role);
};

export const canViewOperationalActivity = (
  activity: { event_type: string; reference_table?: string | null; details?: any },
  role: UserRole,
) => {
  const refTable = (activity.reference_table || '').toLowerCase();
  const details = (activity.details || {}) as Record<string, unknown>;
  const visibilityRoles = Array.isArray(details.visibilityRoles)
    ? (details.visibilityRoles as UserRole[])
    : undefined;

  if (!allowedForRole(visibilityRoles, role)) return false;
  if (role === 'SuperAdmin') return true;
  if (role === 'Admin') return refTable !== 'salary_structures';
  if (role === 'Staff') return refTable !== 'payroll_runs' && refTable !== 'salary_structures';
  if (role === 'Client') {
    if (refTable === 'payroll_runs' || refTable === 'salary_structures') return false;
    const clientSafeEvent = ['notice', 'document', 'approval', 'discussion', 'notification'].includes(activity.event_type);
    const clientVisible = Boolean(details.clientVisible);
    return clientSafeEvent || clientVisible;
  }
  return true;
};
