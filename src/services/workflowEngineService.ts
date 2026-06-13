import type { ApprovalStatus as MasterApprovalStatus, UserRole } from '../types';
import type { InvoiceStatus } from './billing/invoiceTypes';
import type { NoticeStatus } from './noticeService';
import type { PayrollPayoutStatus } from './payrollService';
import type { ApprovalStatus as ApprovalTaskStatus } from './approvalTaskService';
import type { TaskStatus } from './taskService';

export type WorkflowEntity =
  | 'task'
  | 'notice'
  | 'approval'
  | 'approval_task'
  | 'payroll_approval'
  | 'billing_workflow'
  | 'escalation'
  | 'reassignment';

export type StandardWorkflowState =
  | 'Created'
  | 'Assigned'
  | 'In Progress'
  | 'Under Review'
  | 'Escalated'
  | 'Reassigned'
  | 'Pending Approval'
  | 'Completed'
  | 'Archived';

export interface WorkflowLifecycleEvent {
  entity: WorkflowEntity;
  entityId: string;
  from: string | null;
  to: string;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  occurredAt: string;
}

const STANDARD_STATES: StandardWorkflowState[] = [
  'Created',
  'Assigned',
  'In Progress',
  'Under Review',
  'Escalated',
  'Reassigned',
  'Pending Approval',
  'Completed',
  'Archived',
];

const ROLE_OVERRIDES: Partial<Record<UserRole, Partial<Record<WorkflowEntity, string[]>>>> = {
  GodAdmin: {},
  SuperAdmin: {},
  Admin: {
    payroll_approval: ['Created', 'Pending Approval'],
  },
  Staff: {
    task: ['Archived', 'Reassigned'],
    notice: ['Archived'],
    approval: ['Approved', 'Rejected', 'Archived', 'Client Visible'],
    approval_task: ['Approved', 'Rejected', 'Archived', 'Client Visible'],
    payroll_approval: ['Approved', 'Paid', 'Rejected', 'Archived'],
  },
  Client: {
    task: STANDARD_STATES,
    notice: STANDARD_STATES,
    approval: STANDARD_STATES,
    approval_task: STANDARD_STATES,
    payroll_approval: STANDARD_STATES,
    billing_workflow: STANDARD_STATES,
    escalation: STANDARD_STATES,
    reassignment: STANDARD_STATES,
  },
};

const TRANSITIONS: Record<WorkflowEntity, Record<string, string[]>> = {
  task: {
    Created: ['Assigned', 'Escalated', 'Archived'],
    Assigned: ['In Progress', 'Escalated', 'Reassigned', 'Archived', 'Pending Approval'],
    Accepted: ['In Progress', 'Escalated', 'Reassigned', 'Archived', 'Pending Approval'],
    Todo: ['Assigned', 'In Progress', 'Under Review', 'Completed', 'Archived'],
    'In Progress': ['Under Review', 'Escalated', 'Completed', 'Reassigned', 'Pending Approval', 'Archived'],
    Review: ['Under Review', 'In Progress', 'Escalated', 'Reassigned', 'Archived', 'Completed'],
    'Under Review': ['Completed', 'Escalated', 'Reassigned', 'Pending Approval', 'Archived'],
    Escalated: ['Assigned', 'In Progress', 'Under Review', 'Completed', 'Reassigned', 'Pending Approval', 'Archived'],
    Reassigned: ['Assigned', 'In Progress', 'Under Review', 'Escalated', 'Archived'],
    'Pending Approval': ['Under Review', 'Completed', 'Escalated', 'Archived'],
    Completed: ['Archived'],
    Archived: [],
  },
  notice: {
    Received: ['Assigned', 'Escalated', 'Archived'],
    Created: ['Assigned', 'Escalated', 'Archived'],
    Assigned: ['Drafting', 'Under_Review', 'Escalated', 'Reassigned', 'Archived'],
    Drafting: ['Drafted', 'Under_Review', 'Escalated', 'Reassigned', 'Archived'],
    Drafted: ['Under_Review', 'Filed', 'Escalated', 'Reassigned', 'Archived'],
    Under_Review: ['Filed', 'Escalated', 'Reassigned', 'Archived'],
    Escalated: ['Assigned', 'Drafting', 'Under_Review', 'Filed', 'Reassigned', 'Archived'],
    Reassigned: ['Assigned', 'Drafting', 'Under_Review', 'Escalated', 'Archived'],
    Filed: ['Closed', 'Archived'],
    Closed: ['Archived'],
    Archived: [],
  },
  approval: {
    DRAFT: ['PENDING', 'UNDER_REVIEW', 'ARCHIVED'],
    PENDING: ['UNDER_REVIEW', 'APPROVED', 'REWORK', 'REJECTED', 'ARCHIVED'],
    UNDER_REVIEW: ['APPROVED', 'REWORK', 'REJECTED', 'CLIENT_VISIBLE', 'ARCHIVED'],
    REWORK: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
    APPROVED: ['CLIENT_VISIBLE', 'ARCHIVED'],
    CLIENT_VISIBLE: ['ARCHIVED'],
    REJECTED: ['REWORK', 'PENDING', 'ARCHIVED'],
    ARCHIVED: [],
  },
  approval_task: {
    DRAFT: ['PENDING', 'UNDER_REVIEW', 'ARCHIVED'],
    PENDING: ['UNDER_REVIEW', 'APPROVED', 'REWORK', 'REJECTED', 'ARCHIVED'],
    UNDER_REVIEW: ['APPROVED', 'REWORK', 'REJECTED', 'CLIENT_VISIBLE', 'ARCHIVED'],
    REWORK: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
    APPROVED: ['CLIENT_VISIBLE', 'ARCHIVED'],
    CLIENT_VISIBLE: ['ARCHIVED'],
    REJECTED: ['REWORK', 'PENDING', 'ARCHIVED'],
    ARCHIVED: [],
  },
  payroll_approval: {
    Draft: ['Pending Approval', 'Archived'],
    'Pending Approval': ['Approved', 'Rejected', 'Escalated', 'Archived'],
    Approved: ['Paid', 'Archived'],
    Paid: ['Archived'],
    Rejected: ['Pending Approval', 'Archived'],
    Escalated: ['Pending Approval', 'Approved', 'Rejected', 'Archived'],
    Archived: [],
  },
  billing_workflow: {
    Draft: ['Generated', 'Archived'],
    Generated: ['Sent', 'Archived'],
    Sent: ['Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Archived'],
    Viewed: ['Partially Paid', 'Paid', 'Overdue', 'Archived'],
    'Partially Paid': ['Paid', 'Overdue', 'Archived'],
    Overdue: ['Partially Paid', 'Paid', 'Archived'],
    Paid: ['Archived'],
    Cancelled: ['Archived'],
    Archived: [],
  },
  escalation: {
    Created: ['Assigned', 'In Progress', 'Completed', 'Archived'],
    Assigned: ['In Progress', 'Completed', 'Archived'],
    'In Progress': ['Under Review', 'Completed', 'Archived'],
    'Under Review': ['Completed', 'Archived'],
    Completed: ['Archived'],
    Archived: [],
  },
  reassignment: {
    Created: ['Assigned', 'In Progress', 'Completed', 'Archived'],
    Assigned: ['In Progress', 'Completed', 'Archived'],
    'In Progress': ['Under Review', 'Completed', 'Archived'],
    'Under Review': ['Completed', 'Archived'],
    Completed: ['Archived'],
    Archived: [],
  },
};

const getBlockedTargetsForRole = (role: UserRole, entity: WorkflowEntity): Set<string> => {
  if (role === 'GodAdmin' || role === 'SuperAdmin') return new Set();
  const blocked = ROLE_OVERRIDES[role]?.[entity] || [];
  return new Set(blocked);
};

export const canWorkflowTransition = (
  entity: WorkflowEntity,
  from: string,
  to: string,
  role: UserRole
): boolean => {
  if (from === to) return true;
  const blocked = getBlockedTargetsForRole(role, entity);
  if (blocked.has(to)) return false;
  if (role === 'GodAdmin' || role === 'SuperAdmin') return true;
  const allowed = TRANSITIONS[entity][from] || [];
  return allowed.includes(to);
};

export const assertWorkflowTransition = (
  entity: WorkflowEntity,
  from: string,
  to: string,
  role: UserRole
) => {
  if (!canWorkflowTransition(entity, from, to, role)) {
    throw new Error(`Invalid ${entity} transition: ${from} -> ${to} for role ${role}.`);
  }
};

export const toStandardWorkflowState = (value: string): StandardWorkflowState => {
  if (value === 'Created' || value === 'Received' || value === 'Draft' || value === 'DRAFT') return 'Created';
  if (value === 'Assigned') return 'Assigned';
  if (value === 'In Progress' || value === 'Drafting' || value === 'UNDER_REVIEW' || value === 'PENDING') return 'In Progress';
  if (value === 'Under Review' || value === 'Under_Review' || value === 'Review' || value === 'Drafted') return 'Under Review';
  if (value === 'Escalated') return 'Escalated';
  if (value === 'Reassigned') return 'Reassigned';
  if (value === 'Pending Approval') return 'Pending Approval';
  if (value === 'Completed' || value === 'Filed' || value === 'APPROVED' || value === 'Paid') return 'Completed';
  return 'Archived';
};

export const mapTaskToStandardState = (status: TaskStatus): StandardWorkflowState =>
  toStandardWorkflowState(status);

export const mapNoticeToStandardState = (status: NoticeStatus): StandardWorkflowState =>
  toStandardWorkflowState(status);

export const mapApprovalToStandardState = (status: MasterApprovalStatus | ApprovalTaskStatus): StandardWorkflowState =>
  toStandardWorkflowState(status);

export const mapPayrollToStandardState = (status: PayrollPayoutStatus): StandardWorkflowState =>
  toStandardWorkflowState(status);

export const mapBillingToStandardState = (status: InvoiceStatus): StandardWorkflowState =>
  toStandardWorkflowState(status);

export const WORKFLOW_STANDARD_STATES = STANDARD_STATES;
