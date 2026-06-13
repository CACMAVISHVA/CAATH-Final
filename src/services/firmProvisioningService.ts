import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export type FirmProvisioningInput = {
  firmName: string;
  adminName: string;
  adminEmail: string;
  plan: 'Trial' | 'Starter' | 'Professional' | 'Enterprise';
};

export type FirmProvisioningResult = {
  firmId: string;
  subscriptionId: string;
  inviteInstructions: string;
};

export type RoleActivationInput = {
  firmId: string;
  authId: string;
  name: string;
  email: string;
  role: Exclude<UserRole, 'GodAdmin'>;
};

export const createFirmProvisioningPackage = async (
  input: FirmProvisioningInput,
  user: User,
): Promise<FirmProvisioningResult> => {
  if (user.role !== 'GodAdmin') throw new Error('Only GodAdmin can provision firms.');
  if (!input.firmName.trim()) throw new Error('Firm name is required.');
  if (!input.adminEmail.trim()) throw new Error('Admin email is required.');

  const { data: firm, error: firmError } = await supabase
    .from('firms')
    .insert([{ name: input.firmName.trim(), status: 'Pending', created_by: user.authId || null, updated_by: user.authId || null }])
    .select('id')
    .single();
  if (firmError) throw firmError;

  const trialEndsAt = input.plan === 'Trial'
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert([{
      firm_id: firm.id,
      plan: input.plan,
      status: input.plan === 'Trial' ? 'Trial' : 'Pending',
      amount: input.plan === 'Trial' ? 0 : input.plan === 'Starter' ? 1999 : input.plan === 'Professional' ? 4999 : 9999,
      billing_cycle: 'Monthly',
      trial_ends_at: trialEndsAt,
      starts_at: new Date().toISOString(),
      features: {
        clients: true,
        documents: true,
        compliance: true,
        gst: true,
        notifications: true,
      },
      created_by: user.id,
      updated_by: user.id,
    }])
    .select('id')
    .single();
  if (subscriptionError) throw subscriptionError;

  await supabase.from('audit_logs').insert([{
    firm_id: firm.id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'Firm Provisioning Package Created',
    entity_type: 'Firm',
    entity_id: firm.id,
    details: `Created provisioning package for ${input.firmName.trim()} and admin ${input.adminEmail.trim()}.`,
  }]);

  return {
    firmId: firm.id,
    subscriptionId: subscription.id,
    inviteInstructions: [
      `Firm ID: ${firm.id}`,
      `Admin: ${input.adminName.trim() || input.adminEmail.trim()} <${input.adminEmail.trim()}>`,
      'Secure next step: create the Supabase Auth user through Dashboard/CLI, then paste its auth user id into Role Activation.',
      `Activation role: SuperAdmin`,
    ].join('\n'),
  };
};

export const activateProvisionedUser = async (input: RoleActivationInput, user: User) => {
  if (user.role !== 'GodAdmin' && user.role !== 'SuperAdmin') throw new Error('Only platform or firm owners can activate users.');
  if (!input.firmId) throw new Error('Firm ID is required.');
  if (!input.authId) throw new Error('Supabase Auth user ID is required.');
  if (!input.email.trim()) throw new Error('Email is required.');

  const { data, error } = await supabase
    .from('users')
    .insert([{
      auth_id: input.authId,
      firm_id: input.firmId,
      name: input.name.trim() || input.email.trim(),
      email: input.email.trim(),
      role: input.role,
      status: 'Active',
      created_by: user.id,
      updated_by: user.id,
    }])
    .select('id')
    .single();
  if (error) throw error;

  await supabase.from('firms').update({ status: 'Active', updated_at: new Date().toISOString() }).eq('id', input.firmId);

  await supabase.from('audit_logs').insert([{
    firm_id: input.firmId,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'Provisioned User Activated',
    entity_type: 'User',
    entity_id: data.id,
    details: `Activated ${input.role} user ${input.email.trim()}.`,
  }]);

  return data;
};
