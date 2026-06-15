import { supabase } from '../lib/supabase';
import { User, UserRole, WorkspaceSubscriptionPlan, SubscriptionStatus } from '../types';

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

export type WorkspaceRegistrationInput = {
  firmName: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  gstin?: string;
  subscriptionPlan: WorkspaceSubscriptionPlan;
};

const PLAN_LIMITS: Record<WorkspaceSubscriptionPlan, { maxAdmins: number; maxStaff: number; maxClients: number }> = {
  Starter: { maxAdmins: 1, maxStaff: 3, maxClients: 25 },
  Professional: { maxAdmins: 3, maxStaff: 15, maxClients: 100 },
  Enterprise: { maxAdmins: 10, maxStaff: 100, maxClients: 1000 },
};

const createWorkspaceCode = (firmName: string) => {
  const base = firmName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8) || 'CAATH';
  return `${base}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};

const canCreateRole = (actorRole: UserRole | null, targetRole: UserRole) => {
  if (!actorRole) {
    return targetRole === 'Client';
  }
  if (actorRole === 'GodAdmin') {
    return targetRole === 'SuperAdmin' || targetRole === 'Admin' || targetRole === 'Staff' || targetRole === 'Client';
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

export const createWorkspaceOwnerAccount = async ({
  firmName,
  fullName,
  email,
  mobile,
  password,
  gstin,
  subscriptionPlan,
}: WorkspaceRegistrationInput) => {
  const cleanFirmName = firmName.trim();
  const cleanEmail = email.trim();
  const cleanName = fullName.trim();
  const cleanMobile = mobile.trim();
  const limits = PLAN_LIMITS[subscriptionPlan];
  const subscriptionStatus: SubscriptionStatus = 'Trial';
  const subscriptionStartDate = new Date();
  const subscriptionExpiryDate = new Date(subscriptionStartDate);
  subscriptionExpiryDate.setDate(subscriptionExpiryDate.getDate() + 14);

  if (!cleanFirmName || !cleanEmail || !cleanName || !cleanMobile || !password.trim()) {
    throw new Error('Firm name, full name, email, mobile number, and password are required.');
  }

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: cleanEmail,
    password: password.trim(),
    options: {
      data: {
        full_name: cleanName,
        mobile: cleanMobile,
        requested_role: 'SuperAdmin',
      },
    },
  });

  if (signupError) throw signupError;
  const authUser = signupData.user;
  if (!authUser) {
    throw new Error('Supabase did not return an authenticated user for workspace registration.');
  }

  if (!signupData.session) {
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: password.trim() });
    if (loginError) {
      throw new Error('Workspace account created. Please verify your email, then sign in to finish workspace activation.');
    }
  }

  const { data: firm, error: firmError } = await supabase
    .from('firms')
    .insert([{
      name: cleanFirmName,
      firm_name: cleanFirmName,
      workspace_code: createWorkspaceCode(cleanFirmName),
      gstin: gstin?.trim() || null,
      subscription_plan: subscriptionPlan,
      subscription_status: subscriptionStatus,
      subscription_start_date: subscriptionStartDate.toISOString(),
      subscription_expiry_date: subscriptionExpiryDate.toISOString(),
      max_admins: limits.maxAdmins,
      max_staff: limits.maxStaff,
      max_clients: limits.maxClients,
      created_by_auth_id: authUser.id,
      created_by: authUser.id,
    }])
    .select('id')
    .single();

  if (firmError) throw firmError;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert([{
      auth_id: authUser.id,
      firm_id: firm.id,
      name: cleanName,
      email: cleanEmail,
      role: 'SuperAdmin',
      status: 'Active',
      is_workspace_owner: true,
    }])
    .select('id')
    .single();

  if (profileError) throw profileError;

  await supabase.auth.updateUser({
    data: {
      full_name: cleanName,
      mobile: cleanMobile,
      requested_role: 'SuperAdmin',
      requested_firm_id: firm.id,
    },
  });

  return { firmId: firm.id as string, userId: profile.id as string };
};
