import { supabase } from '../lib/supabase';
import { User, UserRole, WorkspaceSubscriptionPlan, SubscriptionStatus } from '../types';
import { authSecurityService } from './authSecurityService';

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

export class WorkspaceOnboardingError extends Error {
  readonly step: string;
  readonly details?: string;

  constructor(step: string, message: string, details?: string) {
    super(message);
    this.name = 'WorkspaceOnboardingError';
    this.step = step;
    this.details = details;
  }
}

const PLAN_LIMITS: Record<WorkspaceSubscriptionPlan, { maxAdmins: number; maxStaff: number; maxClients: number }> = {
  Starter: { maxAdmins: 1, maxStaff: 3, maxClients: 25 },
  Professional: { maxAdmins: 3, maxStaff: 15, maxClients: 100 },
  Enterprise: { maxAdmins: 10, maxStaff: 100, maxClients: 1000 },
};

const canCreateRole = (actorRole: UserRole | null, targetRole: UserRole) => {
  if (!actorRole) {
    return targetRole === 'Client';
  }
  if (actorRole === 'GodAdmin') {
    return targetRole === 'SuperAdmin' || targetRole === 'Admin' || targetRole === 'Staff' || targetRole === 'Client';
  }
  if (actorRole === 'SuperAdmin') {
    return targetRole === 'SuperAdmin' || targetRole === 'Admin' || targetRole === 'Staff' || targetRole === 'Client';
  }
  if (actorRole === 'Admin') {
    return targetRole === 'Staff' || targetRole === 'Client';
  }
  if (actorRole === 'Staff') {
    return targetRole === 'Client';
  }
  return false;
};

const describeSupabaseError = (error: unknown) => {
  if (!error || typeof error !== 'object') return String(error ?? 'Unknown error');
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
  return [
    candidate.message,
    candidate.details ? `Details: ${candidate.details}` : null,
    candidate.hint ? `Hint: ${candidate.hint}` : null,
    candidate.code ? `Code: ${candidate.code}` : null,
  ].filter(Boolean).join(' ');
};

export const getWorkspaceOnboardingErrorMessage = (error: unknown) => {
  if (error instanceof WorkspaceOnboardingError) {
    return `${error.message}${error.details ? ` ${error.details}` : ''}`;
  }
  if (error instanceof Error) return error.message;
  return 'Workspace setup failed. Please try again.';
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
        is_workspace_owner: false,
      },
    },
  });

  if (error) throw error;
  await authSecurityService.recordLoginActivity({
    firmId: resolvedFirmId,
    userId: actor?.id,
    authId: actor?.authId,
    email: email.trim(),
    status: 'Success',
    eventType: 'user_provisioned',
    details: {
      action: 'user_provisioned',
      targetRole: role,
      actorRole: actor?.role ?? 'SelfService',
    },
  });
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
  const subscriptionStatus: SubscriptionStatus = 'Pending Subscription';
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
        is_workspace_owner: true,
      },
    },
  });

  if (signupError) throw signupError;
  const authUser = signupData.user;
  if (!authUser) {
    throw new Error('Supabase did not return an authenticated user for workspace registration.');
  }
  console.info('[AUTH] Workspace signup created auth user', {
    authUserId: authUser.id,
    email: cleanEmail,
    role: 'SuperAdmin',
  });

  if (!signupData.session) {
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: password.trim() });
    if (loginError) {
      throw new Error('Workspace account created. Please verify your email, then sign in to finish workspace activation.');
    }
  }

  const profileInsertLog = {
    auth_id: authUser.id,
    email: cleanEmail,
    role: 'SuperAdmin' as const,
    status: 'Active' as const,
    firm_id: '(created by create_workspace_owner RPC)',
  };
  console.info('[AUTH] Workspace owner profile insert payload', profileInsertLog);

  const { data: bootstrapRows, error: bootstrapError } = await supabase.rpc('create_workspace_owner', {
    p_firm_name: cleanFirmName,
    p_full_name: cleanName,
    p_email: cleanEmail,
    p_mobile: cleanMobile,
    p_gstin: gstin?.trim() || null,
    p_subscription_plan: subscriptionPlan,
    p_subscription_status: subscriptionStatus,
    p_subscription_start_date: subscriptionStartDate.toISOString(),
    p_subscription_expiry_date: subscriptionExpiryDate.toISOString(),
    p_max_admins: limits.maxAdmins,
    p_max_staff: limits.maxStaff,
    p_max_clients: limits.maxClients,
  });

  if (bootstrapError) {
    console.error('[AUTH] Workspace owner bootstrap failed', {
      payload: profileInsertLog,
      error: bootstrapError,
    });
    throw new WorkspaceOnboardingError(
      'workspace_bootstrap',
      'Workspace setup failed after authentication.',
      describeSupabaseError(bootstrapError),
    );
  }

  const bootstrap = Array.isArray(bootstrapRows) ? bootstrapRows[0] : bootstrapRows;
  if (!bootstrap?.firm_id || !bootstrap?.user_id) {
    throw new WorkspaceOnboardingError(
      'workspace_bootstrap',
      'Workspace setup failed after authentication.',
      'The database did not return the created firm and SuperAdmin profile IDs.',
    );
  }

  console.info('[AUTH] Workspace owner profile created', {
    ...profileInsertLog,
    firm_id: bootstrap.firm_id,
    user_id: bootstrap.user_id,
  });
  console.info('[AUTH] Workspace owner profile insert response', {
    auth_id: authUser.id,
    email: cleanEmail,
    firm_id: bootstrap.firm_id,
    role: 'SuperAdmin',
    user_id: bootstrap.user_id,
  });

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      full_name: cleanName,
      mobile: cleanMobile,
      requested_role: 'SuperAdmin',
      requested_firm_id: bootstrap.firm_id,
      is_workspace_owner: true,
    },
  });

  if (metadataError) {
    throw new WorkspaceOnboardingError(
      'auth_metadata_update',
      'Workspace was created, but account metadata could not be finalized.',
      describeSupabaseError(metadataError),
    );
  }

  return { firmId: bootstrap.firm_id as string, userId: bootstrap.user_id as string };
};
