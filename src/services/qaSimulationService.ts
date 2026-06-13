import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export type QaSeverity = 'low' | 'medium' | 'high';

export interface QaIssue {
  area: 'workflow' | 'approval' | 'notification' | 'visibility' | 'governance';
  severity: QaSeverity;
  message: string;
  referenceId?: string;
}

export interface QaSummary {
  timestamp: string;
  checksRun: number;
  passed: number;
  failed: number;
}

export interface QaSimulationReport {
  summary: QaSummary;
  issues: QaIssue[];
  roleSimulation: {
    superAdmin: string[];
    admin: string[];
    staff: string[];
  };
  traces: {
    taskEvents: number;
    approvalEvents: number;
    escalationEvents: number;
    reassignmentEvents: number;
    notificationEvents: number;
  };
}

const VALID_ROLES: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff', 'Client'];
const VALID_APPROVAL_WORKFLOW: Record<string, string[]> = {
  PENDING: ['PENDING', 'UNDER_REVIEW'],
  UNDER_REVIEW: ['UNDER_REVIEW'],
  APPROVED: ['APPROVED', 'CLIENT_VISIBLE', 'ARCHIVED'],
  REJECTED: ['REJECTED'],
  REWORK: ['REWORK'],
  CLIENT_VISIBLE: ['CLIENT_VISIBLE', 'ARCHIVED'],
  ARCHIVED: ['ARCHIVED'],
  DRAFT: ['DRAFT', 'PENDING', 'UNDER_REVIEW'],
};

const TASK_TRANSITIONS: Record<string, string[]> = {
  Created: ['Assigned', 'Escalated', 'Archived'],
  Assigned: ['Accepted', 'Escalated', 'Reassigned', 'Archived'],
  Accepted: ['In Progress', 'Escalated', 'Reassigned', 'Archived'],
  'In Progress': ['Under Review', 'Escalated', 'Completed', 'Reassigned', 'Archived'],
  'Under Review': ['Completed', 'Escalated', 'Reassigned', 'Archived'],
  Escalated: ['Assigned', 'Accepted', 'In Progress', 'Under Review', 'Completed', 'Reassigned', 'Archived'],
  Reassigned: ['Assigned', 'Accepted', 'In Progress', 'Under Review', 'Escalated', 'Archived'],
  Completed: ['Archived'],
  Archived: [],
  Todo: ['Assigned', 'Accepted', 'In Progress', 'Review', 'Completed', 'Archived'],
  Review: ['Completed', 'In Progress', 'Escalated', 'Reassigned', 'Archived'],
};

const isDelegationAllowed = (actorRole?: string | null, assigneeRole?: string | null) => {
  if (!actorRole || !assigneeRole) return false;
  if (actorRole === 'GodAdmin' || actorRole === 'SuperAdmin') return true;
  if (actorRole === 'Admin') return assigneeRole === 'Staff';
  return false;
};

const addCheck = (condition: boolean, failIssue: QaIssue, issues: QaIssue[]) => {
  if (!condition) issues.push(failIssue);
};

export const runEnterpriseQaSimulation = async (firmId: string, user: User): Promise<QaSimulationReport> => {
  const issues: QaIssue[] = [];

  const [tasksRes, usersRes, reassignRes, activityRes, approvalRes, notificationRes, traceRes] = await Promise.all([
    supabase.from('tasks').select('id, assigned_to, status, deadline, updated_at, created_by').eq('firm_id', firmId),
    supabase.from('users').select('id, role, firm_id, status, name').eq('firm_id', firmId),
    supabase.from('task_reassignments').select('id, task_id, reassigned_by, new_assignee, previous_assignee, created_at').eq('firm_id', firmId).order('created_at', { ascending: false }).limit(300),
    supabase.from('task_activities').select('id, task_id, activity_type, previous_value, new_value, user_role, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('approval_tasks').select('id, status, workflow_stage, assigned_to, rework_owner, created_by, approved_by').eq('firm_id', firmId).order('created_at', { ascending: false }).limit(300),
    supabase.from('notifications').select('id, recipient_user_id, audience_role, title, message, created_at, firm_id').eq('firm_id', firmId).order('created_at', { ascending: false }).limit(500),
    supabase.from('enterprise_activities').select('id, event_type, event_subtype').eq('firm_id', firmId).order('created_at', { ascending: false }).limit(500),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (usersRes.error) throw usersRes.error;
  if (reassignRes.error) throw reassignRes.error;
  if (activityRes.error) throw activityRes.error;
  if (approvalRes.error) throw approvalRes.error;
  if (notificationRes.error) throw notificationRes.error;
  if (traceRes.error) throw traceRes.error;

  const tasks = tasksRes.data || [];
  const users = usersRes.data || [];
  const reassignments = reassignRes.data || [];
  const activities = (activityRes.data || []).filter((a) => tasks.some((t) => t.id === a.task_id));
  const approvals = approvalRes.data || [];
  const notifications = notificationRes.data || [];
  const traces = traceRes.data || [];

  const userMap = new Map(users.map((u) => [u.id, u]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  reassignments.forEach((r) => {
    const actor = userMap.get(r.reassigned_by);
    const assignee = r.new_assignee ? userMap.get(r.new_assignee) : null;
    addCheck(!!taskMap.get(r.task_id), {
      area: 'workflow',
      severity: 'high',
      message: 'Reassignment record points to missing task.',
      referenceId: r.id,
    }, issues);
    if (r.new_assignee) {
      addCheck(!!assignee, {
        area: 'governance',
        severity: 'high',
        message: 'Reassignment targets a missing user.',
        referenceId: r.id,
      }, issues);
      addCheck(isDelegationAllowed(actor?.role, assignee?.role), {
        area: 'governance',
        severity: 'high',
        message: 'Reassignment violates role delegation policy.',
        referenceId: r.id,
      }, issues);
    }
  });

  activities
    .filter((a) => a.activity_type === 'status_changed' && a.previous_value && a.new_value)
    .forEach((a) => {
      const allowed = TASK_TRANSITIONS[a.previous_value || ''] || [];
      addCheck(allowed.includes(a.new_value || '') || a.user_role === 'SuperAdmin' || a.user_role === 'GodAdmin', {
        area: 'workflow',
        severity: 'medium',
        message: `Invalid task transition detected (${a.previous_value} -> ${a.new_value}).`,
        referenceId: a.id,
      }, issues);
    });

  tasks
    .filter((t) => t.status === 'Escalated')
    .forEach((t) => {
      const hasFollowup = activities.some((a) => a.task_id === t.id && ['status_changed', 'reassigned'].includes(a.activity_type));
      addCheck(hasFollowup, {
        area: 'workflow',
        severity: 'medium',
        message: 'Escalated task has no follow-up workflow activity.',
        referenceId: t.id,
      }, issues);
    });

  approvals.forEach((a) => {
    const allowed = VALID_APPROVAL_WORKFLOW[a.status] || [];
    addCheck(allowed.includes(a.workflow_stage), {
      area: 'approval',
      severity: 'high',
      message: `Approval status/workflow mismatch (${a.status} vs ${a.workflow_stage}).`,
      referenceId: a.id,
    }, issues);
    if (a.status === 'REWORK') {
      addCheck(!!a.rework_owner, {
        area: 'approval',
        severity: 'high',
        message: 'Rework approval missing rework owner.',
        referenceId: a.id,
      }, issues);
    }
  });

  const notifSignature = new Set<string>();
  notifications.forEach((n) => {
    if (n.recipient_user_id) {
      addCheck(userMap.has(n.recipient_user_id), {
        area: 'notification',
        severity: 'high',
        message: 'Notification recipient user missing.',
        referenceId: n.id,
      }, issues);
    }
    if (n.audience_role) {
      addCheck(VALID_ROLES.includes(n.audience_role as UserRole), {
        area: 'notification',
        severity: 'medium',
        message: 'Notification audience role is invalid.',
        referenceId: n.id,
      }, issues);
    }
    const signature = `${n.recipient_user_id || 'role:' + n.audience_role}|${n.title}|${n.message}|${new Date(n.created_at).toISOString().slice(0, 16)}`;
    if (notifSignature.has(signature)) {
      issues.push({
        area: 'notification',
        severity: 'low',
        message: 'Potential duplicate notification detected.',
        referenceId: n.id,
      });
    } else {
      notifSignature.add(signature);
    }
  });

  if (user.role === 'Staff') {
    const staffTasks = tasks.filter((t) => t.assigned_to === user.id);
    addCheck(staffTasks.length <= tasks.length, {
      area: 'visibility',
      severity: 'high',
      message: 'Staff visibility scope check failed.',
    }, issues);
  }

  const summary: QaSummary = {
    timestamp: new Date().toISOString(),
    checksRun: tasks.length + reassignments.length + approvals.length + notifications.length,
    passed: 0,
    failed: issues.length,
  };
  summary.passed = Math.max(summary.checksRun - summary.failed, 0);

  return {
    summary,
    issues,
    roleSimulation: {
      superAdmin: [
        'Assign tasks to Admin/Staff',
        'Reassign and override escalated workflows',
        'Approve or reject governance workflows',
      ],
      admin: [
        'Assign tasks to Staff',
        'Review progress and escalate to SuperAdmin',
        'Handle approval queue and rework routing',
      ],
      staff: [
        'Update assigned task progress',
        'Cannot reassign ownership',
        'Cannot approve governance workflows',
      ],
    },
    traces: {
      taskEvents: traces.filter((t) => t.event_type === 'task').length,
      approvalEvents: traces.filter((t) => t.event_type === 'approval').length,
      escalationEvents: traces.filter((t) => String(t.event_subtype || '').includes('escalat')).length,
      reassignmentEvents: traces.filter((t) => t.event_type === 'reassignment').length,
      notificationEvents: traces.filter((t) => t.event_type === 'notification').length,
    },
  };
};

