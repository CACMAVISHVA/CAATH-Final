import { canWorkflowTransition, WorkflowEntity } from '../../../services/workflowEngineService';
import { logEnterpriseActivity } from '../../../services/observabilityService';
import { workflowIntegrityRepository } from '../repositories/WorkflowIntegrityRepository';
import { lifecycleIntegrityPolicyEngine, WorkflowIntegrityFinding, WorkflowIntegritySummary } from '../policies/lifecyclePolicies';

const extractNoticeMarker = (description: string | null) => {
  if (!description) return null;
  const match = description.match(/\[NOTICE_WORKFLOW:([a-f0-9-]+)\]/i);
  return match?.[1] || null;
};

const parseJsonSafe = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export const workflowLifecycleIntegrityOrchestrator = {
  async getWorkflowLifecycleIntegritySummary(firmId: string): Promise<WorkflowIntegritySummary> {
    const now = new Date();
    const threeDaysAgoIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { tasks, notices, approvals, payrollRuns, invoices, reassignments, auditLogs } = await workflowIntegrityRepository.loadIntegrityInputs(
      firmId,
      sevenDaysAgoIso,
    );

    const findings: WorkflowIntegrityFinding[] = [];
    const pushFinding = (finding: WorkflowIntegrityFinding) => findings.push(finding);

    const taskByNoticeId = new Map<string, { id: string; status: string; assigned_to: string | null; client_id: string | null }>();
    tasks.forEach((task: any) => {
      const marker = extractNoticeMarker(task.description || null);
      if (marker) {
        taskByNoticeId.set(marker, {
          id: task.id,
          status: task.status,
          assigned_to: task.assigned_to || null,
          client_id: task.client_id || null,
        });
      }
    });

    let invalidTransitions = 0;
    (auditLogs as any[]).forEach((log) => {
      const details = parseJsonSafe(log.details);
      const from = details?.from;
      const to = details?.to;
      const entityType = (log.entity_type || '').toLowerCase();
      const role = log.user_role as any;
      if (!from || !to || !role) return;

      const entity: WorkflowEntity | null =
        entityType === 'task'
          ? 'task'
          : entityType === 'notice'
            ? 'notice'
            : entityType === 'approvaltask' || entityType === 'approval_task'
              ? 'approval_task'
              : entityType === 'approval'
                ? 'approval'
                : entityType === 'payroll'
                  ? 'payroll_approval'
                  : null;
      if (!entity) return;

      if (!canWorkflowTransition(entity, from, to, role)) {
        invalidTransitions += 1;
        pushFinding({
          id: `invalid-${log.id}`,
          category: 'invalid_transition',
          severity: 'critical',
          summary: `Invalid ${entity} transition detected in audit trail: ${from} -> ${to}.`,
          entity,
          entityId: log.entity_id || undefined,
          recommendation: 'Review transition guardrails and confirm role authorization for this lifecycle step.',
        });
      }
    });

    let orphanWorkflows = 0;
    (notices as any[]).forEach((notice) => {
      const linkedTask = taskByNoticeId.get(notice.id);
      if (!linkedTask && !['Closed', 'Archived'].includes(notice.status)) {
        orphanWorkflows += 1;
        pushFinding({
          id: `orphan-notice-${notice.id}`,
          category: 'orphan_workflow',
          severity: 'warning',
          summary: `Notice ${notice.notice_number || notice.id.slice(0, 8)} has no linked operational task.`,
          entity: 'notice',
          entityId: notice.id,
          recommendation: 'Create or relink a workflow task to restore notice execution continuity.',
        });
      }
    });

    let brokenOwnershipChains = 0;
    (tasks as any[]).forEach((task) => {
      if (!['Completed', 'Archived'].includes(task.status) && !task.assigned_to) {
        brokenOwnershipChains += 1;
        pushFinding({
          id: `ownership-task-${task.id}`,
          category: 'ownership_chain',
          severity: 'warning',
          summary: 'Active task without owner detected.',
          entity: 'task',
          entityId: task.id,
          recommendation: 'Assign a workflow owner to prevent lifecycle stalls.',
        });
      }
    });

    let noticeTaskSyncFailures = 0;
    (notices as any[]).forEach((notice) => {
      const linkedTask = taskByNoticeId.get(notice.id);
      if (!linkedTask) return;
      if (notice.client_id !== linkedTask.client_id) {
        noticeTaskSyncFailures += 1;
        pushFinding({
          id: `notice-client-mismatch-${notice.id}`,
          category: 'notice_task_mismatch',
          severity: 'critical',
          summary: 'Notice-task linkage has client ownership mismatch.',
          entity: 'cross_domain',
          entityId: notice.id,
          recommendation: 'Correct client mapping between notice and linked task records.',
        });
      } else if (Boolean(notice.assigned_to) !== Boolean(linkedTask.assigned_to)) {
        noticeTaskSyncFailures += 1;
        pushFinding({
          id: `notice-assignee-mismatch-${notice.id}`,
          category: 'notice_task_mismatch',
          severity: 'warning',
          summary: 'Notice and linked task assignee continuity is inconsistent.',
          entity: 'cross_domain',
          entityId: notice.id,
          recommendation: 'Resync notice and task ownership assignments.',
        });
      }
    });

    let approvalInconsistencies = 0;
    (approvals as any[]).forEach((approval) => {
      if (['PENDING', 'UNDER_REVIEW'].includes(approval.status) && approval.updated_at && approval.updated_at <= sevenDaysAgoIso) {
        approvalInconsistencies += 1;
        pushFinding({
          id: `approval-stuck-${approval.id}`,
          category: 'approval_inconsistency',
          severity: 'warning',
          summary: 'Approval workflow unresolved for 7+ days.',
          entity: 'approval_task',
          entityId: approval.id,
          recommendation: 'Escalate to reviewer queue and trigger reminder workflow.',
        });
      }
    });

    (payrollRuns as any[]).forEach((run) => {
      if (run.payout_status === 'Approved' && (!run.approved_by || !run.approved_at)) {
        approvalInconsistencies += 1;
        pushFinding({
          id: `payroll-approval-metadata-${run.id}`,
          category: 'approval_inconsistency',
          severity: 'critical',
          summary: 'Payroll run marked approved without approval metadata.',
          entity: 'payroll_approval',
          entityId: run.id,
          recommendation: 'Backfill approval attribution metadata to keep payroll governance audit-safe.',
        });
      }
    });

    const clientsWithPaidInvoice = new Set(
      (invoices as any[])
        .filter((inv) => ['Paid', 'Partially Paid', 'Sent', 'Viewed', 'Overdue'].includes(inv.status))
        .map((inv) => inv.client_id),
    );

    let billingContinuityGaps = 0;
    (tasks as any[]).forEach((task) => {
      if (task.status === 'Completed' && task.client_id && !clientsWithPaidInvoice.has(task.client_id)) {
        billingContinuityGaps += 1;
      }
    });

    if (billingContinuityGaps > 0) {
      pushFinding({
        id: 'billing-gap-summary',
        category: 'billing_continuity_gap',
        severity: billingContinuityGaps >= 8 ? 'critical' : 'warning',
        summary: `${billingContinuityGaps} completed workflows have no billing continuity signal.`,
        entity: 'billing_workflow',
        recommendation: 'Review completed workflow items and queue invoice generation/receivables follow-up.',
      });
    }

    const stuckWorkflows = (tasks as any[]).filter(
      (task) => !['Completed', 'Archived'].includes(task.status) && task.updated_at && task.updated_at <= sevenDaysAgoIso,
    ).length;

    const overdueEscalationChains = (tasks as any[]).filter(
      (task) => task.status === 'Escalated' && task.updated_at && task.updated_at <= threeDaysAgoIso,
    ).length;

    const escalationLoops = (auditLogs as any[]).filter((log) => {
      const details = parseJsonSafe(log.details);
      return details?.from === 'Escalated' && details?.to === 'Escalated';
    }).length;

    const reassignmentByTask: Record<string, number> = {};
    (reassignments as any[]).forEach((item) => {
      reassignmentByTask[item.task_id] = (reassignmentByTask[item.task_id] || 0) + 1;
    });

    const reassignmentInstability = Object.values(reassignmentByTask).filter((count) => count >= 3).length;
    if (reassignmentInstability > 0) {
      pushFinding({
        id: 'reassignment-instability',
        category: 'ownership_chain',
        severity: 'warning',
        summary: `${reassignmentInstability} tasks show reassignment instability (3+ reassignments).`,
        entity: 'reassignment',
        recommendation: 'Review ownership governance and stabilize assignment criteria for volatile workflows.',
      });
    }

    const unresolvedApprovalClusters = (approvals as any[]).filter((item) =>
      ['PENDING', 'UNDER_REVIEW', 'REWORK'].includes(item.status),
    ).length;

    const scores = lifecycleIntegrityPolicyEngine.score({
      invalidTransitions,
      orphanWorkflows,
      brokenOwnershipChains,
      noticeTaskSyncFailures,
      approvalInconsistencies,
      billingContinuityGaps,
      stuckWorkflows,
      escalationLoops,
      reassignmentInstability,
      overdueEscalationChains,
    });

    const recoverySuggestions: string[] = [];
    if (invalidTransitions > 0) recoverySuggestions.push('Tighten role-transition guardrails for detected invalid lifecycle moves.');
    if (orphanWorkflows > 0) recoverySuggestions.push('Relink orphan notices and active items to executable workflow records.');
    if (overdueEscalationChains > 0) recoverySuggestions.push('Prioritize escalated workflows older than 3 days into a governance triage lane.');
    if (unresolvedApprovalClusters > 0) recoverySuggestions.push('Batch unresolved approvals with SLA-based reviewer assignment.');
    if (billingContinuityGaps > 0) recoverySuggestions.push('Queue completed workflow items for billing continuity and receivables tracking.');
    if (recoverySuggestions.length === 0) recoverySuggestions.push('Workflow integrity is stable; continue periodic governance checks.');

    const summary: WorkflowIntegritySummary = {
      generatedAt: new Date().toISOString(),
      workflowHealthScore: scores.workflowHealthScore,
      operationalIntegrityScore: scores.operationalIntegrityScore,
      lifecycleReliabilityScore: scores.lifecycleReliabilityScore,
      counts: {
        invalidTransitions,
        orphanWorkflows,
        brokenOwnershipChains,
        noticeTaskSyncFailures,
        approvalInconsistencies,
        billingContinuityGaps,
        stuckWorkflows,
        escalationLoops,
        reassignmentInstability,
        unresolvedApprovalClusters,
        overdueEscalationChains,
      },
      findings: findings.slice(0, 30),
      recoverySuggestions,
    };

    await logEnterpriseActivity({
      firm_id: firmId,
      event_type: 'workflow_integrity_run',
      event_subtype: 'lifecycle_integrity_summary',
      severity: summary.workflowHealthScore < 60 ? 'warning' : 'info',
      details: {
        workflowHealthScore: summary.workflowHealthScore,
        counts: summary.counts,
      },
    });

    return summary;
  },
};
