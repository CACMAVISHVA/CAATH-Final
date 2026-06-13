import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export const ONBOARDING_ROLES: UserRole[] = ['SuperAdmin', 'Admin', 'Staff', 'Client'];
export const SELF_SERVICE_ONBOARDING_ROLE: UserRole = 'Client';

export type RoleOnboardingInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  firmId?: string;
  actor?: User | null;
};

const canCreateRole = (actorRole: UserRole | null, targetRole: UserRole) => {
  if (!actorRole) {
    return targetRole === 'Client';
  }
  if (actorRole === 'SuperAdmin') {
    return targetRole === 'Admin' || targetRole === 'Staff' || targetRole === 'Client';
  }
  if (actorRole === 'Admin') {
    return targetRole === 'Staff' || targetRole === 'Client';
  }
  return false;
};

const assertRoleCreationAllowed = (actor: User | null | undefined, targetRole: UserRole) => {
  const actorRole = actor?.role ?? null;
  if (!canCreateRole(actorRole, targetRole)) {
    if (!actorRole) {
      throw new Error('Self-service onboarding is restricted to Client accounts.');
    }
    throw new Error(`Role governance restriction: ${actorRole} cannot create ${targetRole} accounts.`);
  }
};

export const createAccountWithRole = async ({
  email,
  password,
  fullName,
  role,
  firmId,
  actor,
}: RoleOnboardingInput) => {
  assertRoleCreationAllowed(actor, role);

  const resolvedFirmId = actor?.firmId || firmId || null;
  if (role !== 'GodAdmin' && !resolvedFirmId) {
    throw new Error('A valid firm workspace ID is required to create this account.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      data: {
        full_name: fullName.trim(),
        requested_role: role,
        requested_firm_id: resolvedFirmId,
      },
    },
  });

  if (error) throw error;
  return data;
};
