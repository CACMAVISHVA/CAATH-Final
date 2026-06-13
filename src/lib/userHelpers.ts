import { Session } from '@supabase/supabase-js';
import { User, UserRole } from '../types';

const ROLE_LABELS: Record<string, string> = {
  godadmin: 'Platform Admin',
  superadmin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  client: 'Client',
};

const normalizeRawName = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractEmailUsername = (email?: string): string | undefined => {
  if (!email) return undefined;
  const localPart = email.split('@')[0].trim();
  return localPart.length > 0 ? localPart : undefined;
};

export const normalizeRoleLabel = (role?: string | null): string => {
  if (!role) return 'User';
  return ROLE_LABELS[role.toLowerCase()] || role.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const getUserFullName = (user?: User | null, session?: Session | null): string => {
  const candidates = [
    normalizeRawName((user as any)?.full_name),
    normalizeRawName((user as any)?.display_name),
    normalizeRawName((user as any)?.first_name),
    normalizeRawName(user?.name),
    normalizeRawName(user?.email),
    normalizeRawName(session?.user.email),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      if (candidate.includes('@')) {
        const username = extractEmailUsername(candidate);
        if (username) return username;
      }
      return candidate;
    }
  }

  return 'User';
};

export const getUserFirstName = (user?: User | null, session?: Session | null): string => {
  const fullName = getUserFullName(user, session);
  if (!fullName || fullName.toLowerCase() === 'user') return 'User';

  const [firstName] = fullName.split(' ').filter(Boolean);
  if (firstName && firstName.toLowerCase() !== 'user') return firstName;
  return fullName;
};

export const getUserDisplayRole = (user?: User | null): string => normalizeRoleLabel(user?.role);
