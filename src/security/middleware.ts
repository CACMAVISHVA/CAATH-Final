import { User } from '../types';
import { SecurityAppError } from './secureError';
import { hasAnyRole } from './roles';
import { assertTenantIdPresent } from './tenant';

export const requireAuthenticatedUser = (user: User | null | undefined): User => {
  if (!user) throw new SecurityAppError('Authentication required.', 'AUTH_REQUIRED', 401);
  return user;
};

export const requireTenantContext = (user: User): string => {
  if (user.role === 'GodAdmin') {
    if (!user.firmId) return '';
    return user.firmId;
  }
  return assertTenantIdPresent(user.firmId);
};

export const requireRole = (user: User, allowedRoles: string[]): void => {
  if (!hasAnyRole(user.role, allowedRoles)) {
    throw new SecurityAppError('Insufficient privileges.', 'FORBIDDEN', 403);
  }
};

export const assertTenantMatch = (user: User, targetTenantId: string): void => {
  if (user.role === 'GodAdmin') return;
  const userTenant = requireTenantContext(user);
  if (userTenant !== targetTenantId) {
    throw new SecurityAppError('Cross-tenant access denied.', 'TENANT_FORBIDDEN', 403);
  }
};
