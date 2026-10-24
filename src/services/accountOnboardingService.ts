import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserRole, WorkspaceSubscriptionPlan, SubscriptionStatus } from '../types';
import { authSecurityService } from './authSecurityService';
import { firstValidationError, normalizeIndianPhone, validateEmail, validateGSTIN, validateIndianMobile, validateRequiredName } from '../lib/fieldValidation';

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
  'CAATH Practice OS': { maxAdmins: -1, maxStaff: -1, maxClients: -1 },
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const createProvisioningAuthClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
    storageKey: `caath-provisioning-${crypto.randomUUID()}`,
  },
});

const normalizeProvisioningEmail = (email: string) => email.trim().toLowerCase();

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

  const cleanEmail = normalizeProvisioningEmail(email);
  const cleanName = fullName.trim();
  const cleanPassword = password.trim();
  const resolvedFirmId = actor?.firmId || firmId || null;
  if (role !== 'GodAdmin' && !resolvedFirmId) {
    throw new Error('A valid firm workspace ID is required to create this account.');
  }
  const identityError = firstValidationError(validateRequiredName(cleanName, 'Full name'), validateEmail(cleanEmail));
  if (identityError) throw new Error(identityError);
  if (!cleanPassword) throw new Error('Temporary password is required.');
  if (cleanPassword.length < 8) {
    throw new Error('Temporary password must be at least 8 characters.');
  }

  const duplicateQuery = supabase
    .from('users')
    .select('id, email, firm_id')
    .ilike('email', cleanEmail)
    .limit(1);

  const { data: existingProfile, error: duplicateError } = resolvedFirmId
    ? await duplicateQuery.eq('firm_id', resolvedFirmId).maybeSingle()
    : await duplicateQuery.maybeSingle();

  if (duplicateError && duplicateError.code !== 'PGRST116') {
    throw new Error(`Could not validate duplicate email: ${describeSupabaseError(duplicateError)}`);
  }
  if (existingProfile) {
    throw new Error('This email is already registered in this workspace.');
  }

  const provisioningClient = createProvisioningAuthClient();
  const { data, error } = await provisioningClient.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        full_name: cleanName,
        requested_role: role,
        requested_firm_id: resolvedFirmId,
        is_workspace_owner: false,
      },
    },
  });

  if (error) throw error;
  const authUser = data.user;
  if (!authUser?.id) {
    throw new Error('Account invitation was started, but Supabase did not return the new user identity.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .upsert([{
      auth_id: authUser.id,
      firm_id: resolvedFirmId,
      name: cleanName,
      email: cleanEmail,
      role,
      status: 'Active',
      is_workspace_owner: false,
      created_by: actor?.id ?? null,
      updated_by: actor?.id ?? null,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'auth_id' })
    .select()
    .single();

  if (profileError) {
    throw new WorkspaceOnboardingError(
      'profile_provisioning',
      'Authentication identity was created, but the staff profile could not be provisioned.',
      describeSupabaseError(profileError),
    );
  }

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
  return { auth: data, profile };
};

export const createWorkspaceOwnerAccount = async ({
  firmName,
  fullName,
  email,
  mobile,
  password,
  gstin,
}: WorkspaceRegistrationInput) => {
  const cleanFirmName = firmName.trim();
  const cleanEmail = email.trim();
  const cleanName = fullName.trim();
  const cleanMobile = normalizeIndianPhone(mobile);
  const limits = PLAN_LIMITS['CAATH Practice OS'];
  const subscriptionStatus: SubscriptionStatus = 'Trial';
  const subscriptionStartDate = new Date();
  const subscriptionExpiryDate = new Date(subscriptionStartDate);
  subscriptionExpiryDate.setDate(subscriptionExpiryDate.getDate() + 15);

  const registrationError = firstValidationError(
    validateRequiredName(cleanFirmName, 'Firm name'),
    validateRequiredName(cleanName, 'Full name'),
    validateEmail(cleanEmail),
    validateIndianMobile(cleanMobile),
    validateGSTIN(gstin || ''),
  );
  if (registrationError) throw new Error(registrationError);
  if (!password.trim()) throw new Error('Password is required.');

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
    p_subscription_plan: 'CAATH Practice OS',
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
