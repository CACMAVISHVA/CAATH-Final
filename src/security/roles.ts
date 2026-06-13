import { UserRole } from '../types';

export const PORTAL_WRITE_ROLES: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff'];
export const PORTAL_ADMIN_ROLES: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin'];

export const hasAnyRole = (role: string | undefined, allowed: string[]): boolean =>
  Boolean(role && allowed.includes(role));
