/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { canApproveOrReject } from '../lib/permissions';
import { User, ApprovalStatus, ApprovalWorkflowStage } from '../types';
import { assertWorkflowTransition } from './workflowEngineService';
import { publishEnterpriseEvent } from './enterpriseEventBusService';

const APPROVER_ROLES = ['GodAdmin', 'SuperAdmin', 'Admin'];

const isApproverRole = (user: User | null | undefined): boolean => {
  return user !== null && user !== undefined && APPROVER_ROLES.includes(user.role);
};

const requireFirmId = (user: User) => {
  if (!user.firmId) {
    throw new Error('A firm workspace is required for this approval action.');
  }
  return user.firmId;
};

export type AuditAction =
  | 'Created'
  | 'Submitted for Review'
  | 'Moved to Review'
  | 'Approved'
  | 'Rejected'
  | 'Sent for Rework'
  | 'Archived'
  | 'Client Visible';

export type AuditEntityType =
  | 'Document'
  | 'Client'
  | 'Task'
  | 'Billing'
  | 'Notice'
  | 'Compliance'
  | 'Approval';

const writeAuditLog = async (params: {
  firmId: string;
  user: User;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  details: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}) => {
  const { error } = await supabase.from('audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
    before_state: params.beforeState ? JSON.stringify(params.beforeState) : null,
    after_state: params.afterState ? JSON.stringify(params.afterState) : null,
  }]);

  if (error) {
    console.error('Failed to write audit log:', error);
  }
};

export type ApprovalInput = {
  firmId: string;
  module: string;
  recordId: string;
  status?: ApprovalStatus;
  workflowStage?: ApprovalWorkflowStage;
  assignedTo?: string;
  user: User;
};

export const createApproval = async ({
  firmId,
  module,
  recordId,
  status = 'PENDING',
  workflowStage = 'UNDER_REVIEW',
  assignedTo,
  user,
}: ApprovalInput) => {
  const { data, error } = await supabase
    .from('approvals')
    .insert([{
      firm_id: firmId,
      module,
      record_id: recordId,
      status,
      workflow_stage: workflowStage,
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
    action: 'Created',
    entityType: 'Approval',
    entityId: data.id,
    details: `Approval record created for ${module}: ${recordId}`,
  });

  return data;
};

export const submitForApproval = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can submit for approval.');
  }
  const firmId = requireFirmId(user);

  const { data: before } = await supabase
    .from('approvals')
    .select('status, workflow_stage')
    .eq('id', approvalId)
    .single();
  assertWorkflowTransition('approval', before?.status || 'DRAFT', 'PENDING', user.role);

  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'PENDING',
      workflow_stage: 'UNDER_REVIEW',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Submitted for Review',
    entityType: 'Approval',
    entityId: approvalId,
    details: 'Approval submitted for review.',
    beforeState: before ?? undefined,
    afterState: { status: 'PENDING', workflow_stage: 'UNDER_REVIEW' },
  });
};

export const approveRecord = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can approve records.');
  }
  const firmId = requireFirmId(user);

  const { data: before } = await supabase
    .from('approvals')
    .select('status, workflow_stage')
    .eq('id', approvalId)
    .single();
  assertWorkflowTransition('approval', before?.status || 'DRAFT', 'APPROVED', user.role);

  const { error } = await supabase
    .from('approvals')
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
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Approved',
    entityType: 'Approval',
    entityId: approvalId,
    details: `Approved by ${user.name} (${user.role})`,
    beforeState: before ?? undefined,
    afterState: { status: 'APPROVED', approved_by: user.id, approved_at: new Date().toISOString() },
  });

  await publishEnterpriseEvent({
    eventName: 'approval_completed',
    firmId,
    sourceService: 'approvalService.approveRecord',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'approvals',
    workflowId: approvalId,
    payload: { status: 'APPROVED' },
  });
};

export const rejectRecord = async (approvalId: string, user: User, reason: string) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can reject records.');
  }
  if (!reason.trim()) {
    throw new Error('Rejection reason is required.');
  }
  const firmId = requireFirmId(user);

  const { data: before } = await supabase
    .from('approvals')
    .select('status, workflow_stage')
    .eq('id', approvalId)
    .single();
  assertWorkflowTransition('approval', before?.status || 'DRAFT', 'REJECTED', user.role);

  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'REJECTED',
      workflow_stage: 'REJECTED',
      rejection_reason: reason.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Rejected',
    entityType: 'Approval',
    entityId: approvalId,
    details: `Rejected by ${user.name} (${user.role}). Reason: ${reason}`,
    beforeState: before ?? undefined,
    afterState: { status: 'REJECTED', rejection_reason: reason },
  });
};

export const sendForRework = async (approvalId: string, user: User, reworkOwnerId: string, reason: string) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can send records for rework.');
  }
  const firmId = requireFirmId(user);

  const { data: before } = await supabase
    .from('approvals')
    .select('status, workflow_stage')
    .eq('id', approvalId)
    .single();
  assertWorkflowTransition('approval', before?.status || 'DRAFT', 'REWORK', user.role);

  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'REWORK',
      workflow_stage: 'REWORK',
      rework_owner: reworkOwnerId,
      rejection_reason: reason || 'Sent for rework',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Sent for Rework',
    entityType: 'Approval',
    entityId: approvalId,
    details: `Sent to rework by ${user.name}. Reason: ${reason}`,
    beforeState: before ?? undefined,
    afterState: { status: 'REWORK', rework_owner: reworkOwnerId },
  });
};

export const markClientVisible = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can mark records as client visible.');
  }
  const firmId = requireFirmId(user);

  const { data: before } = await supabase
    .from('approvals')
    .select('status, workflow_stage')
    .eq('id', approvalId)
    .single();
  assertWorkflowTransition('approval', before?.status || 'DRAFT', 'CLIENT_VISIBLE', user.role);

  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'CLIENT_VISIBLE',
      workflow_stage: 'CLIENT_VISIBLE',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Client Visible',
    entityType: 'Approval',
    entityId: approvalId,
    details: `Marked as client visible by ${user.name}`,
    beforeState: before ?? undefined,
    afterState: { status: 'CLIENT_VISIBLE' },
  });
};

export const archiveRecord = async (approvalId: string, user: User) => {
  if (!canApproveOrReject(user)) {
    throw new Error('Only GodAdmin, SuperAdmin, or Admin can archive records.');
  }
  const firmId = requireFirmId(user);

  const { data: before } = await supabase
    .from('approvals')
    .select('status, workflow_stage')
    .eq('id', approvalId)
    .single();
  assertWorkflowTransition('approval', before?.status || 'DRAFT', 'ARCHIVED', user.role);

  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'ARCHIVED',
      workflow_stage: 'ARCHIVED',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditLog({
    firmId,
    user,
    action: 'Archived',
    entityType: 'Approval',
    entityId: approvalId,
    details: `Archived by ${user.name}`,
    beforeState: before ?? undefined,
    afterState: { status: 'ARCHIVED' },
  });
};

export const getApprovalByRecord = async (firmId: string, module: string, recordId: string) => {
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('firm_id', firmId)
    .eq('module', module)
    .eq('record_id', recordId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
};

export const getPendingApprovals = async (firmId: string) => {
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('firm_id', firmId)
    .in('status', ['PENDING', 'UNDER_REVIEW'])
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

export const getMyPendingApprovals = async (user: User) => {
  if (!user.firmId) return [];

  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('firm_id', user.firmId)
    .eq('assigned_to', user.id)
    .in('status', ['PENDING', 'UNDER_REVIEW', 'REWORK'])
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

export { isApproverRole };
