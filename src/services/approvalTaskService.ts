/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';
import { canApproveOrReject } from '../lib/permissions';
import { assertWorkflowTransition } from './workflowEngineService';
import { publishEnterpriseEvent } from './enterpriseEventBusService';

export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REWORK' | 'CLIENT_VISIBLE' | 'ARCHIVED';
export type WorkflowStage = 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REWORK' | 'CLIENT_VISIBLE' | 'ARCHIVED';

export type ApprovalTaskRow = {
  id: string;
  firm_id: string;
  module: string;
  record_id: string;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  workflow_stage: WorkflowStage;
  assigned_to: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  rework_owner: string | null;
  updated_by: string | null;
  reassigned_by: string | null;
  escalated_by: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalInput = {
  firmId: string;
  module: string;
  recordId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  user: User;
};

const writeAuditLog = async (params: {
  firmId: string;
  user: User;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
}) => {
  await supabase.from('audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
  }]);
};

export const createApprovalTask = async ({
  firmId,
  module,
  recordId,
  title,
  description,
  assignedTo,
  user,
}: ApprovalInput) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can create approval tasks.');
  }

  const { data, error } = await supabase
    .from('approval_tasks')
    .insert([{
      firm_id: firmId,
      module,
      record_id: recordId,
      title,
      description,
      status: 'PENDING',
      workflow_stage: 'PENDING',
      assigned_to: assignedTo,
      created_by: user.id,
      updated_by: user.id,
    }])
    .select('id')
    .single();

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Approval Task Created',
    entityType: 'ApprovalTask',
    entityId: data.id,
    details: `Approval task "${title}" created for ${module}.`,
  });

  return data;
};

export const submitForReview = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can submit for review.');
  }

  const { data: before } = await supabase
    .from('approval_tasks')
    .select('status')
    .eq('id', approvalId)
    .maybeSingle();
  assertWorkflowTransition('approval_task', before?.status || 'DRAFT', 'UNDER_REVIEW', user.role);

  const { error } = await supabase
    .from('approval_tasks')
    .update({
      status: 'UNDER_REVIEW',
      workflow_stage: 'UNDER_REVIEW',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', user.firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId: user.firmId!,
    user,
    action: 'Submitted for Review',
    entityType: 'ApprovalTask',
    entityId: approvalId,
    details: 'Approval task submitted for review.',
  });
};

export const approveApprovalTask = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can approve approval tasks.');
  }

  const { data: before } = await supabase
    .from('approval_tasks')
    .select('status')
    .eq('id', approvalId)
    .maybeSingle();
  assertWorkflowTransition('approval_task', before?.status || 'DRAFT', 'APPROVED', user.role);

  const { error } = await supabase
    .from('approval_tasks')
    .update({
      status: 'APPROVED',
      workflow_stage: 'APPROVED',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', user.firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId: user.firmId!,
    user,
    action: 'Approved',
    entityType: 'ApprovalTask',
    entityId: approvalId,
    details: `Approved by ${user.name} (${user.role}).`,
  });

  await publishEnterpriseEvent({
    eventName: 'approval_completed',
    firmId: user.firmId!,
    sourceService: 'approvalTaskService.approveApprovalTask',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'approval_tasks',
    workflowId: approvalId,
    payload: { status: 'APPROVED' },
  });
};

export const rejectApprovalTask = async (approvalId: string, user: User, reason: string) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can reject approval tasks.');
  }

  if (!reason.trim()) {
    throw new Error('Rejection reason is required.');
  }

  const { data: before } = await supabase
    .from('approval_tasks')
    .select('status')
    .eq('id', approvalId)
    .maybeSingle();
  assertWorkflowTransition('approval_task', before?.status || 'DRAFT', 'REJECTED', user.role);

  const { error } = await supabase
    .from('approval_tasks')
    .update({
      status: 'REJECTED',
      workflow_stage: 'REJECTED',
      rejection_reason: reason.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', user.firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId: user.firmId!,
    user,
    action: 'Rejected',
    entityType: 'ApprovalTask',
    entityId: approvalId,
    details: `Rejected by ${user.name}. Reason: ${reason}`,
  });
};

export const sendToRework = async (approvalId: string, user: User, reworkOwnerId: string, reason: string) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can send for rework.');
  }

  const { data: before } = await supabase
    .from('approval_tasks')
    .select('status')
    .eq('id', approvalId)
    .maybeSingle();
  assertWorkflowTransition('approval_task', before?.status || 'DRAFT', 'REWORK', user.role);

  const { error } = await supabase
    .from('approval_tasks')
    .update({
      status: 'REWORK',
      workflow_stage: 'REWORK',
      rework_owner: reworkOwnerId,
      rejection_reason: reason || 'Sent for rework',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', user.firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId: user.firmId!,
    user,
    action: 'Sent for Rework',
    entityType: 'ApprovalTask',
    entityId: approvalId,
    details: `Sent for rework by ${user.name}. Reason: ${reason}`,
  });
};

export const markClientVisible = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can mark as client visible.');
  }

  const { data: before } = await supabase
    .from('approval_tasks')
    .select('status')
    .eq('id', approvalId)
    .maybeSingle();
  assertWorkflowTransition('approval_task', before?.status || 'DRAFT', 'CLIENT_VISIBLE', user.role);

  const { error } = await supabase
    .from('approval_tasks')
    .update({
      status: 'CLIENT_VISIBLE',
      workflow_stage: 'CLIENT_VISIBLE',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', user.firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId: user.firmId!,
    user,
    action: 'Client Visible',
    entityType: 'ApprovalTask',
    entityId: approvalId,
    details: `Marked as client visible by ${user.name}.`,
  });
};

export const getApprovalTasks = async (firmId: string) => {
  const { data, error } = await supabase
    .from('approval_tasks')
    .select('*')
    .eq('firm_id', firmId)
    .in('status', ['PENDING', 'UNDER_REVIEW', 'REWORK'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ApprovalTaskRow[];
};

export const getApprovalTaskById = async (approvalId: string, firmId?: string) => {
  let query = supabase
    .from('approval_tasks')
    .select('*')
    .eq('id', approvalId);

  if (firmId) {
    query = query.eq('firm_id', firmId);
  }

  const { data, error } = await query.single();
  if (error) throw error;
  return data as ApprovalTaskRow | null;
};

export const getAllApprovalTasks = async (firmId: string) => {
  const { data, error } = await supabase
    .from('approval_tasks')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ApprovalTaskRow[];
};

export const getMyApprovalTasks = async (userId: string, firmId: string) => {
  const { data, error } = await supabase
    .from('approval_tasks')
    .select('*')
    .eq('firm_id', firmId)
    .or(`assigned_to.eq.${userId},rework_owner.eq.${userId}`)
    .in('status', ['PENDING', 'UNDER_REVIEW', 'REWORK'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ApprovalTaskRow[];
};

export const getPendingCount = async (firmId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('approval_tasks')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId)
    .in('status', ['PENDING', 'UNDER_REVIEW']);

  if (error) return 0;
  return count || 0;
};
