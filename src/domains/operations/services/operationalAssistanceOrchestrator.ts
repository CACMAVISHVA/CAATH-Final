import { User, UserRole } from '../../../types';
import { getPredictiveOperationalSnapshot } from '../../../services/predictiveOperationalIntelligenceService';
import { getRevenueIntelligenceSnapshot } from '../../../services/revenueIntelligenceService';
import { getWorkflowLifecycleIntegritySummary } from '../../../services/workflowLifecycleIntegrityService';
import { getDocumentIntelligenceDashboardSummary } from '../../../services/documents/documentIntelligenceDashboardService';
import { analyticsEventPublisher } from '../../analytics/services/analyticsEventPublisher';
import { canRoleViewAssistance, assistancePriorityRank, toAssistancePriority } from '../policies/assistancePolicies';
import { buildOperationalMetadata } from '../context/operationalMetadata';
import { emitOperationalGuidanceEvent } from '../events/operationalGuidanceEvents';

export type AssistanceCategory =
  | 'reassignment'
  | 'escalation'
  | 'overdue_prioritization'
  | 'billing'
  | 'invoice_generation'
  | 'workflow_balancing'
  | 'compliance_attention'
  | 'document_notice';

export interface OperationalAssistanceRecommendation {
  id: string;
  category: AssistanceCategory;
  title: string;
  rationale: string;
  suggestedAction: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  governanceNote: string;
  requiresApproval: boolean;
  roleVisibility: UserRole[];
}

export interface OperationalAssistanceSnapshot {
  generatedAt: string;
  recommendations: OperationalAssistanceRecommendation[];
}

export const operationalAssistanceOrchestrator = {
  async getSnapshot(user: User): Promise<OperationalAssistanceSnapshot> {
    if (!user.firmId) return { generatedAt: new Date().toISOString(), recommendations: [] };

    const metadata = buildOperationalMetadata(user);
    const [predictive, revenue, integrity, document] = await Promise.all([
      getPredictiveOperationalSnapshot(user.firmId),
      getRevenueIntelligenceSnapshot(user.firmId),
      getWorkflowLifecycleIntegritySummary(user.firmId),
      getDocumentIntelligenceDashboardSummary(user.firmId),
    ]);

    const recommendations: OperationalAssistanceRecommendation[] = [];

    recommendations.push({
      id: 'assist-workload-reassign',
      category: 'reassignment',
      title: 'Reassignment recommendation for overloaded workflows',
      rationale: `${predictive.staffLoadRisks.filter((s) => s.riskBand !== 'low').length} staff load risk signals detected.`,
      suggestedAction: 'Review high-load owners and prepare a governed reassignment batch for non-critical items.',
      priority: toAssistancePriority(predictive.workloadImbalanceScore),
      governanceNote: 'Recommendation only. Bulk reassignment should be confirmed by Admin/SuperAdmin.',
      requiresApproval: true,
      roleVisibility: ['SuperAdmin', 'Admin'],
    });
    recommendations.push({
      id: 'assist-escalation-overdue',
      category: 'escalation',
      title: 'Escalation suggestion for overdue workflows',
      rationale: `${integrity.counts.overdueEscalationChains} overdue escalation chains are active.`,
      suggestedAction: 'Route overdue escalations into a governance triage queue with SLA ordering.',
      priority: toAssistancePriority(integrity.counts.overdueEscalationChains * 20),
      governanceNote: 'Escalation routing remains human-controlled.',
      requiresApproval: true,
      roleVisibility: ['SuperAdmin', 'Admin', 'Staff'],
    });
    recommendations.push({
      id: 'assist-overdue-prioritize',
      category: 'overdue_prioritization',
      title: 'Overdue workflow prioritization',
      rationale: `${predictive.riskSignals.find((s) => s.key === 'overdue_workflow_clusters')?.value || 0} overdue workflow items detected.`,
      suggestedAction: 'Group overdue workflows by client-impact and due-date age; execute top 10 first.',
      priority: toAssistancePriority((predictive.riskSignals.find((s) => s.key === 'overdue_workflow_clusters')?.value || 0) * 6),
      governanceNote: 'Prioritization aid only; execution order approved by role owner.',
      requiresApproval: false,
      roleVisibility: ['SuperAdmin', 'Admin', 'Staff'],
    });
    recommendations.push({
      id: 'assist-billing-pressure',
      category: 'billing',
      title: 'Billing pressure mitigation',
      rationale: `${revenue.kpis.completedTasksAwaitingBilling} completed tasks await billing and overdue collections are ${revenue.kpis.overdueCollections}.`,
      suggestedAction: 'Create a billing action lane for completed tasks older than 7 days and overdue collections.',
      priority: toAssistancePriority(predictive.billingPressureScore),
      governanceNote: 'Billing actions require role-authorized validation before execution.',
      requiresApproval: true,
      roleVisibility: ['SuperAdmin', 'Admin'],
    });
    recommendations.push({
      id: 'assist-invoice-generation',
      category: 'invoice_generation',
      title: 'Invoice generation reminder queue',
      rationale: `${revenue.kpis.completedTasksAwaitingBilling} workflows are billable but not yet invoiced.`,
      suggestedAction: 'Prepare invoice recommendation queue sorted by aging risk and client receivable history.',
      priority: toAssistancePriority(revenue.kpis.completedTasksAwaitingBilling * 10),
      governanceNote: 'Invoice generation remains manual approval-driven.',
      requiresApproval: true,
      roleVisibility: ['SuperAdmin', 'Admin'],
    });
    recommendations.push({
      id: 'assist-workflow-balance',
      category: 'workflow_balancing',
      title: 'Workflow balancing suggestion',
      rationale: `${predictive.staffLoadRisks.filter((r) => r.riskBand === 'high').length} high-risk workload owners detected.`,
      suggestedAction: 'Balance workflow queue by redistributing low-priority work and preserving critical-path continuity.',
      priority: toAssistancePriority(predictive.workloadImbalanceScore),
      governanceNote: 'Use role-bound assignment controls; avoid automated reassignment.',
      requiresApproval: true,
      roleVisibility: ['SuperAdmin', 'Admin'],
    });
    recommendations.push({
      id: 'assist-compliance-attention',
      category: 'compliance_attention',
      title: 'Compliance attention alert',
      rationale: `${predictive.riskSignals.find((s) => s.key === 'unresolved_notice_accumulation')?.value || 0} unresolved notice/compliance risk points.`,
      suggestedAction: 'Trigger compliance response huddle for unresolved notices and upcoming regulatory deadlines.',
      priority: toAssistancePriority((predictive.riskSignals.find((s) => s.key === 'unresolved_notice_accumulation')?.value || 0) * 8),
      governanceNote: 'Escalation and response ownership must be assigned by authorized managers.',
      requiresApproval: false,
      roleVisibility: ['SuperAdmin', 'Admin', 'Staff', 'Client'],
    });
    recommendations.push({
      id: 'assist-document-notice',
      category: 'document_notice',
      title: 'Document + notice backlog assistance',
      rationale: `${document.processingBacklog} processing backlog and ${document.overdueDocumentWorkflows} overdue document workflows.`,
      suggestedAction: 'Prioritize unresolved notice documents and extraction failures to restore response continuity.',
      priority: toAssistancePriority(document.processingBacklog * 8 + document.overdueDocumentWorkflows * 12),
      governanceNote: 'Document-to-workflow linking remains review-gated.',
      requiresApproval: false,
      roleVisibility: ['SuperAdmin', 'Admin', 'Staff', 'Client'],
    });

    const prioritized = recommendations
      .filter((rec) => canRoleViewAssistance(rec.roleVisibility, user.role))
      .sort((a, b) => assistancePriorityRank[b.priority] - assistancePriorityRank[a.priority]);

    const criticalCount = prioritized.filter((r) => r.priority === 'critical').length;
    try {
      await analyticsEventPublisher.publish({
        event: 'WORKFLOW_LATENCY_EVENT',
        payload: {
          tenantId: metadata.tenantId,
          workflowType: 'operational_assistance_snapshot',
          workflowId: metadata.correlationId,
          latencyMs: 0,
        },
        actor: { id: metadata.actorId, name: metadata.actorName, role: metadata.actorRole },
        severity: criticalCount > 0 ? 'warning' : 'info',
      });
      await emitOperationalGuidanceEvent(
        'OPERATIONAL_ASSISTANCE_TRIGGERED',
        {
          tenantId: metadata.tenantId,
          actorRole: metadata.actorRole,
          recommendationCount: prioritized.length,
          criticalCount,
          correlationId: metadata.correlationId,
        },
        metadata.actorId,
      );
    } catch {
      // non-blocking
    }

    return {
      generatedAt: new Date().toISOString(),
      recommendations: prioritized.slice(0, 10),
    };
  },
};
