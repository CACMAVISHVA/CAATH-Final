/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { notifyApprovalComplete, notifyApprovalRequired } from './notificationService';
import { approveApprovalTask, getApprovalTaskById, rejectApprovalTask } from './approvalTaskService';
import { User } from '../types';

export interface FirmRecord {
  id: string;
  name: string;
  status: string;
}

export interface FirmSubscriptionRecord {
  id: string;
  firm_id: string;
  plan: string;
  status: string;
  amount: number | null;
  billing_cycle: string;
  starts_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  features: Record<string, unknown> | null;
}

export const fetchFirmProfile = async (firmId: string): Promise<FirmRecord | null> => {
  const { data, error } = await supabase
    .from('firms')
    .select('id, name, status')
    .eq('id', firmId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FirmRecord | null;
};

export const fetchLatestFirmSubscription = async (
  firmId: string
): Promise<FirmSubscriptionRecord | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, firm_id, plan, status, amount, billing_cycle, starts_at, expires_at, trial_ends_at, features')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FirmSubscriptionRecord | null;
};

export const updateOwnProfile = async (
  userId: string,
  updates: { name: string; email: string }
): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ name: updates.name.trim(), email: updates.email.trim(), updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw error;
  }
};

export const submitProfileChangeRequest = async (
  user: User,
  requestedName: string,
  requestedEmail: string,
  reason: string
): Promise<void> => {
  if (!reason.trim()) {
    throw new Error('Please provide a reason for the profile change request.');
  }

  const beforeState = {
    name: user.name,
    email: user.email,
  };
  const afterState = {
    name: requestedName.trim(),
    email: requestedEmail.trim(),
  };

  const profileTask = {
    firm_id: user.firmId ?? null,
    module: 'Profile',
    record_id: user.id,
    title: 'Profile Update Request',
    description: JSON.stringify({
      reason: reason.trim(),
      requesterName: user.name,
      requesterRole: user.role,
      beforeState,
      afterState,
    }),
    status: 'PENDING',
    workflow_stage: 'UNDER_REVIEW',
    assigned_to: null,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await supabase.from('approval_tasks').insert([profileTask]).select('id').single();
  if (error) {
    throw error;
  }

  await supabase.from('audit_logs').insert([{ 
    firm_id: user.firmId ?? null,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'Profile Update Request',
    entity_type: 'ApprovalTask',
    entity_id: data.id,
    details: reason.trim(),
    before_state: beforeState,
    after_state: afterState,
    created_by: user.id,
    updated_by: user.id,
  }]);

  const firmId = user.firmId;
  if (!firmId) {
    throw new Error('A firm workspace is required to submit a profile change request.');
  }

  await notifyApprovalRequired(
    data.id,
    `Profile change request from ${user.name}`,
    'SuperAdmin',
    firmId,
    user.name
  );
};

export const approveProfileChangeRequest = async (
  approvalId: string,
  user: User
): Promise<void> => {
  const approvalTask = await getApprovalTaskById(approvalId, user.firmId);
  if (!approvalTask) {
    throw new Error('Approval task not found.');
  }

  const details = approvalTask.description ? JSON.parse(approvalTask.description) : {};
  const updates = {
    name: details.afterState?.name ?? undefined,
    email: details.afterState?.email ?? undefined,
  };

  await approveApprovalTask(approvalId, user);

  if (updates.name || updates.email) {
    await updateOwnProfile(approvalTask.record_id, {
      name: updates.name || '',
      email: updates.email || '',
    });
  }

  const approvalRequesterId = approvalTask.created_by;
  const approvalFirmId = approvalTask.firm_id;
  if (!approvalRequesterId || !approvalFirmId) {
    throw new Error('Approval task metadata is incomplete.');
  }

  await notifyApprovalComplete(
    approvalId,
    approvalTask.title,
    'APPROVED',
    approvalRequesterId,
    approvalFirmId,
    user.name
  );
};

export const rejectProfileChangeRequest = async (
  approvalId: string,
  user: User,
  reason: string
): Promise<void> => {
  const approvalTask = await getApprovalTaskById(approvalId, user.firmId);
  if (!approvalTask) {
    throw new Error('Approval task not found.');
  }

  await rejectApprovalTask(approvalId, user, reason.trim());

  const approvalRequesterId = approvalTask.created_by;
  const approvalFirmId = approvalTask.firm_id;
  if (!approvalRequesterId || !approvalFirmId) {
    throw new Error('Approval task metadata is incomplete.');
  }

  await notifyApprovalComplete(
    approvalId,
    approvalTask.title,
    'REJECTED',
    approvalRequesterId,
    approvalFirmId,
    user.name
  );
};
