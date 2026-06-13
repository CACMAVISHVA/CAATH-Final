import { User, UserRole } from '../../../types';
import { getDashboardMetrics } from '../../../services/dashboardService';
import { getOperationalHealthSummary } from '../../../services/operationalIntelligenceService';
import { getRevenueIntelligenceSnapshot } from '../../../services/revenueIntelligenceService';
import { getDocumentIntelligenceDashboardSummary } from '../../../services/documents/documentIntelligenceDashboardService';
import { getEnterpriseKnowledgeGraphSnapshot } from '../../../services/enterpriseKnowledgeGraphService';
import { getEnterpriseFinancialIntelligenceSnapshot } from '../../../services/enterpriseFinancialIntelligenceService';
import { getOperationalTimelineSnapshot } from '../../../services/operationalCollaborationService';
import { getEnterpriseOrchestrationSnapshot } from '../../../services/enterpriseOrchestrationService';
import { getIntegrationHealthSnapshot } from '../../../services/enterpriseIntegrationOrchestrationService';
import { getOperationalAssistanceSnapshot, OperationalAssistanceRecommendation } from '../../../services/operationalAssistanceEngineService';
import { filterAlertsForRole, getRoleHeadline } from '../policies/roles/roleAwareVisibilityPolicies';
import { analyticsEventPublisher } from '../../analytics/services/analyticsEventPublisher';
import { buildOperationalMetadata } from '../context/operationalMetadata';
import { emitOperationalGuidanceEvent } from '../events/operationalGuidanceEvents';

export interface PrioritizedAlert {
  id: string;
  title: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  group: 'workflow' | 'governance' | 'billing' | 'approvals' | 'notice' | 'document' | 'workload';
  score: number;
}

export interface CommandCenterSummary {
  headline: string;
  executiveSummary: string;
  governanceSnapshot: string;
  billingPressureSummary: string;
  escalationSummary: string;
  workflowHealthSummary: string;
}

export interface RoleCommandCenterSnapshot {
  role: UserRole;
  generatedAt: string;
  priorityScore: number;
  urgencyBand: 'stable' | 'watch' | 'elevated' | 'critical';
  keyMetrics: Array<{ label: string; value: string }>;
  alerts: PrioritizedAlert[];
  groupedAlerts: Record<string, PrioritizedAlert[]>;
  recommendations: OperationalAssistanceRecommendation[];
  summary: CommandCenterSummary;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const severityForScore = (score: number): PrioritizedAlert['severity'] => (score >= 85 ? 'critical' : score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low');
const urgencyBandForScore = (score: number): RoleCommandCenterSnapshot['urgencyBand'] => (score >= 80 ? 'critical' : score >= 60 ? 'elevated' : score >= 35 ? 'watch' : 'stable');

const pushAlert = (list: PrioritizedAlert[], id: string, title: string, summary: string, group: PrioritizedAlert['group'], baseScore: number) => {
  const score = clamp(baseScore);
  list.push({ id, title, summary, group, score, severity: severityForScore(score) });
};

export const roleAwareCommandCenterOrchestrator = {
  async getSnapshot(user: User): Promise<RoleCommandCenterSnapshot> {
    if (!user.firmId) {
      return {
        role: user.role,
        generatedAt: new Date().toISOString(),
        priorityScore: 0,
        urgencyBand: 'stable',
        keyMetrics: [],
        alerts: [],
        groupedAlerts: {},
        recommendations: [],
        summary: {
          headline: 'Command center unavailable',
          executiveSummary: 'Firm context is required for operational intelligence.',
          governanceSnapshot: 'No governance data available.',
          billingPressureSummary: 'No billing data available.',
          escalationSummary: 'No escalation data available.',
          workflowHealthSummary: 'No workflow health data available.',
        },
      };
    }

    const metadata = buildOperationalMetadata(user);
    const [metrics, health, revenue, document, assistance, knowledgeGraph, financial, collaboration, orchestration, integration] = await Promise.all([
      getDashboardMetrics(user.firmId),
      getOperationalHealthSummary(user.firmId),
      getRevenueIntelligenceSnapshot(user.firmId),
      getDocumentIntelligenceDashboardSummary(user.firmId),
      getOperationalAssistanceSnapshot(user),
      getEnterpriseKnowledgeGraphSnapshot(user.firmId, user),
      user.role === 'SuperAdmin' ? getEnterpriseFinancialIntelligenceSnapshot(user.firmId, user) : Promise.resolve(null),
      getOperationalTimelineSnapshot(user, 60),
      getEnterpriseOrchestrationSnapshot(user),
      getIntegrationHealthSnapshot(user),
    ]);

    const alerts: PrioritizedAlert[] = [];
    pushAlert(alerts, 'alert-escalations', 'Escalation pressure', `${metrics.escalationAlerts} escalation-linked workflows need attention.`, 'workflow', metrics.escalationAlerts * 8);
    pushAlert(alerts, 'alert-approvals', 'Approval bottleneck', `${metrics.stalledApprovals} stalled approvals and ${metrics.pendingApprovals} pending approvals.`, 'approvals', metrics.stalledApprovals * 14 + metrics.pendingApprovals * 3);
    pushAlert(alerts, 'alert-billing', 'Billing pressure', `${revenue.kpis.completedTasksAwaitingBilling} completed workflows await billing; overdue collections at ${revenue.kpis.overdueCollections}.`, 'billing', revenue.kpis.completedTasksAwaitingBilling * 7 + Math.round(revenue.kpis.overdueCollections / 50000) * 8);
    pushAlert(alerts, 'alert-integrity', 'Workflow integrity risk', `${health.integrity.counts.invalidTransitions} invalid transitions and ${health.integrity.counts.noticeTaskSyncFailures} sync failures detected.`, 'governance', health.integrity.counts.invalidTransitions * 20 + health.integrity.counts.noticeTaskSyncFailures * 12);
    pushAlert(alerts, 'alert-document', 'Document intelligence backlog', `${document.processingBacklog} unprocessed docs, ${document.extractionFailures} extraction failures.`, 'document', document.processingBacklog * 8 + document.extractionFailures * 12);
    pushAlert(alerts, 'alert-workload', 'Workload imbalance', `${metrics.overloadedStaff} overloaded staff and ${metrics.overdueClusters} overdue clusters.`, 'workload', metrics.overloadedStaff * 14 + metrics.overdueClusters * 10);
    pushAlert(alerts, 'alert-relationship-pressure', 'Cross-domain dependency pressure', `${knowledgeGraph.metrics.dependencyChains} dependency chains and context pressure score ${knowledgeGraph.metrics.crossDomainPressure}.`, 'governance', knowledgeGraph.metrics.crossDomainPressure);
    if (financial) {
      pushAlert(alerts, 'alert-financial-liquidity', 'Executive liquidity pressure', `Liquidity pressure ${financial.balanceSheet.liquidityPressureScore}, overdue collections ${financial.balanceSheet.overdueCollections}.`, 'billing', financial.balanceSheet.liquidityPressureScore);
    }
    pushAlert(alerts, 'alert-collaboration-chains', 'Collaboration continuity risk', `${collaboration.intelligence.unresolvedCommunicationChains} open communication chains and ${collaboration.intelligence.stalledApprovalsDueToMissingResponse} stalled approval response gaps.`, 'workflow', collaboration.intelligence.unresolvedCommunicationChains * 9 + collaboration.intelligence.stalledApprovalsDueToMissingResponse * 12);
    pushAlert(alerts, 'alert-orchestration-continuity', 'Orchestration continuity risk', `${orchestration.summary.blockedChains} blocked chains, ${orchestration.summary.pendingGovernanceApprovals} pending governance approvals, ${orchestration.summary.stalledChains} stalled chains.`, 'governance', orchestration.summary.blockedChains * 15 + orchestration.summary.pendingGovernanceApprovals * 10 + orchestration.summary.stalledChains * 12);
    pushAlert(alerts, 'alert-integration-health', 'Integration ecosystem reliability', `${integration.summary.blockedChains} blocked integration chains, ${integration.summary.failedChains} failed chains, connector reliability ${integration.summary.connectorReliabilityScore}.`, 'governance', integration.summary.blockedChains * 14 + integration.summary.failedChains * 18 + (100 - integration.summary.connectorReliabilityScore));

    let filtered = filterAlertsForRole(user.role, alerts);
    if (user.role === 'Client') {
      filtered = [
        ...filtered,
        {
          id: 'client-submissions',
          title: 'Pending submissions',
          summary: `${document.processingBacklog} requested/pending submission items are awaiting processing.`,
          group: 'document',
          score: clamp(document.processingBacklog * 10 + metrics.filingCount * 4),
          severity: severityForScore(clamp(document.processingBacklog * 10 + metrics.filingCount * 4)),
        },
      ];
    }

    const prioritized = filtered.sort((a, b) => b.score - a.score).slice(0, 8);
    const priorityScore = clamp(prioritized.slice(0, 3).reduce((sum, item) => sum + item.score, 0) / Math.max(1, Math.min(3, prioritized.length)));
    const groupedAlerts = prioritized.reduce((acc: Record<string, PrioritizedAlert[]>, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});

    const keyMetrics =
      user.role === 'SuperAdmin'
        ? [
            { label: 'Operational Health', value: `${health.score}` },
            { label: 'Governance Risk', value: `${health.predictive.governanceRiskScore}` },
            { label: 'Escalation Alerts', value: `${metrics.escalationAlerts}` },
            { label: 'Billing Pressure', value: `${health.predictive.billingPressureScore}` },
            ...(financial ? [{ label: 'Profitability Score', value: `${financial.pnl.profitabilityScore}` }] : []),
            ...(financial ? [{ label: 'Liquidity Pressure', value: `${financial.balanceSheet.liquidityPressureScore}` }] : []),
          ]
        : user.role === 'Admin'
          ? [
              { label: 'Team Overload', value: `${metrics.overloadedStaff}` },
              { label: 'Approval Pressure', value: `${health.approvalPressure}` },
              { label: 'Reassignments', value: `${metrics.reassignmentEvents}` },
              { label: 'Overdue Clusters', value: `${metrics.overdueClusters}` },
            ]
          : user.role === 'Staff'
            ? [
                { label: 'My Workflow Focus', value: `${metrics.pendingWorkloads}` },
                { label: 'Escalation Alerts', value: `${metrics.escalationAlerts}` },
                { label: 'Pending Approvals', value: `${metrics.pendingApprovals}` },
                { label: 'Deadlines Overdue', value: `${metrics.overdueTasks}` },
              ]
            : [
                { label: 'Pending Submissions', value: `${document.processingBacklog}` },
                { label: 'Unresolved Notices', value: `${document.unresolvedNotices}` },
                { label: 'Compliance Deadlines', value: `${metrics.filingCount}` },
                { label: 'Requested Documents', value: `${document.processingBacklog + document.extractionFailures}` },
              ];

    const summary: CommandCenterSummary = {
      headline: getRoleHeadline(user.role),
      executiveSummary: `Priority score ${priorityScore} (${urgencyBandForScore(priorityScore)}). ${prioritized.length} actionable alerts surfaced with noise reduction.`,
      governanceSnapshot: `Integrity ${health.workflowHealthScore}, lifecycle reliability ${health.lifecycleReliabilityScore}, invalid transitions ${health.integrity.counts.invalidTransitions}, relationship pressure ${knowledgeGraph.metrics.crossDomainPressure}.`,
      billingPressureSummary: `Receivables pending ${revenue.kpis.receivablesPending}, overdue ${revenue.kpis.overdueCollections}, unbilled workflows ${revenue.kpis.completedTasksAwaitingBilling}.${financial ? ` Profitability score ${financial.pnl.profitabilityScore}.` : ''}`,
      escalationSummary: `${metrics.escalationAlerts} escalation alerts and ${health.predictive.escalationHeatmap.reduce((s, p) => s + p.count, 0)} escalation events in trend window.`,
      workflowHealthSummary: `${metrics.pendingWorkloads} active workloads, ${metrics.overdueTasks} overdue tasks, ${metrics.overdueClusters} overdue clusters.`,
    };

    try {
      await analyticsEventPublisher.publish({
        event: 'WORKFLOW_LATENCY_EVENT',
        payload: {
          tenantId: metadata.tenantId,
          workflowType: 'role_command_center_snapshot',
          workflowId: metadata.correlationId,
          latencyMs: 0,
        },
        actor: { id: metadata.actorId, name: metadata.actorName, role: metadata.actorRole },
        severity: priorityScore >= 80 ? 'warning' : 'info',
      });
      await emitOperationalGuidanceEvent('ROLE_DASHBOARD_CONTEXT_UPDATED', {
        tenantId: metadata.tenantId,
        role: metadata.roleContext,
        priorityScore,
        urgencyBand: urgencyBandForScore(priorityScore),
        correlationId: metadata.correlationId,
      }, metadata.actorId);

      if (priorityScore >= 80) {
        await emitOperationalGuidanceEvent('WORKFLOW_RISK_IDENTIFIED', {
          tenantId: metadata.tenantId,
          role: metadata.roleContext,
          riskScore: priorityScore,
          riskSource: prioritized[0]?.id || 'command_center',
          correlationId: metadata.correlationId,
        }, metadata.actorId);
      }
    } catch {
      // keep snapshot path stable
    }

    return {
      role: user.role,
      generatedAt: new Date().toISOString(),
      priorityScore,
      urgencyBand: urgencyBandForScore(priorityScore),
      keyMetrics,
      alerts: prioritized,
      groupedAlerts,
      recommendations: assistance.recommendations,
      summary,
    };
  },
};
