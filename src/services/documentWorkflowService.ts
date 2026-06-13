/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { canApproveDocuments, canReviewDocuments, canApproveOrReject } from '../lib/permissions';
import { User } from '../types';
import { publishEnterpriseEvent } from './enterpriseEventBusService';

type DocumentUploadInput = {
  firmId: string;
  clientId: string;
  fileName: string;
  storagePath: string;
  category: string;
  user: User;
};

const requireFirmId = (user: User) => {
  if (!user.firmId) {
    throw new Error('A firm workspace is required for this document workflow action.');
  }
  return user.firmId;
};

const writeAuditEvent = async (params: {
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

export const createPendingDocument = async ({
  firmId,
  clientId,
  fileName,
  storagePath,
  category,
  user,
}: DocumentUploadInput) => {
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      firm_id: firmId,
      client_id: clientId,
      name: fileName,
      storage_path: storagePath,
      category,
      status: 'PENDING',
      workflow_stage: 'ADMIN_REVIEW',
      visible_to_client: false,
      uploaded_by: user.id,
      created_by: user.id,
      updated_by: user.id,
    }])
    .select('id')
    .single();

  if (error) throw error;

  await writeAuditEvent({
    firmId,
    user,
    action: 'Document Uploaded',
    entityType: 'Document',
    entityId: data.id,
    details: `${fileName} uploaded and queued for admin review.`,
  });

  return data;
};

export const markAdminReviewed = async (documentId: string, user: User) => {
  if (!canReviewDocuments(user)) {
    throw new Error('Only Admins and SuperAdmins can review documents.');
  }
  const firmId = requireFirmId(user);

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'UNDER_REVIEW',
      workflow_stage: 'SUPERADMIN_APPROVAL',
      admin_reviewed_by: user.id,
      admin_reviewed_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditEvent({
    firmId,
    user,
    action: 'Admin Review Completed',
    entityType: 'Document',
    entityId: documentId,
    details: 'Document moved to SuperAdmin approval.',
  });

  await publishEnterpriseEvent({
    eventName: 'document_reviewed',
    firmId,
    sourceService: 'documentWorkflowService.markAdminReviewed',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'documents',
    workflowId: documentId,
    payload: { stage: 'ADMIN_REVIEW', status: 'UNDER_REVIEW' },
  });
};

export const approveDocumentForClient = async (documentId: string, user: User) => {
  if (!canApproveDocuments(user)) {
    throw new Error('Only SuperAdmins can approve documents for client visibility.');
  }
  const firmId = requireFirmId(user);

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'CLIENT_VISIBLE',
      workflow_stage: 'CLIENT_VISIBLE',
      visible_to_client: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', documentId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditEvent({
    firmId,
    user,
    action: 'Document Approved',
    entityType: 'Document',
    entityId: documentId,
    details: 'Document approved and made visible in the client portal.',
  });

  await publishEnterpriseEvent({
    eventName: 'document_reviewed',
    firmId,
    sourceService: 'documentWorkflowService.approveDocumentForClient',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'documents',
    workflowId: documentId,
    payload: { stage: 'CLIENT_VISIBLE', status: 'CLIENT_VISIBLE' },
  });
};

export const rejectDocument = async (documentId: string, user: User, reason: string, reworkOwnerId?: string) => {
  if (!canReviewDocuments(user)) {
    throw new Error('Only Admins and SuperAdmins can reject documents.');
  }
  const firmId = requireFirmId(user);

  const status = reworkOwnerId ? 'REWORK' : 'REJECTED';
  const workflowStage = reworkOwnerId ? 'REWORK' : 'REJECTED';

  const { error } = await supabase
    .from('documents')
    .update({
      status,
      workflow_stage: workflowStage,
      visible_to_client: false,
      rejection_reason: reason,
      rework_owner: reworkOwnerId,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('firm_id', firmId);

  if (error) throw error;

  await writeAuditEvent({
    firmId,
    user,
    action: 'Document Rejected',
    entityType: 'Document',
    entityId: documentId,
    details: reason || 'Document rejected for rework.',
  });
};
