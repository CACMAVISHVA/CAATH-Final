import { User } from '../types';
import { getOperationalHealthSummary } from './operationalIntelligenceService';
import { getEnterpriseFinancialIntelligenceSnapshot } from './enterpriseFinancialIntelligenceService';
import { getDocumentIntelligenceDashboardSummary } from './documents/documentIntelligenceDashboardService';
import { getPredictiveOperationalSnapshot } from './predictiveOperationalIntelligenceService';

export type ExecutiveInsightSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ExecutiveInsightDomain = 'workflow' | 'approval' | 'notice' | 'billing' | 'payroll' | 'document' | 'compliance' | 'client';

export interface ExecutiveDecisionInsight {
  id: string;
  title: string;
  domain: ExecutiveInsightDomain;
  severity: ExecutiveInsightSeverity;
  summary: string;
  evidence: string[];
  actionContext: string;
}

export interface ExecutiveDecisionSnapshot {
  generatedAt: string;
  operationalSeverityScore: number;
  decisionHeat: {
    workflow: number;
    approval: number;
    financial: number;
    compliance: number;
  };
  insights: ExecutiveDecisionInsight[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const pushInsight = (
  list: ExecutiveDecisionInsight[],
  insight: Omit<ExecutiveDecisionInsight, 'id'>
) => {
  list.push({
    id: `${insight.domain}-${insight.title.toLowerCase().replace(/\s+/g, '-')}`,
    ...insight,
  });
};

export const getExecutiveDecisionSnapshot = async (user: User): Promise<ExecutiveDecisionSnapshot | null> => {
  if (!user.firmId) return null;

  const [ops, docs, predictive, financial] = await Promise.all([
    getOperationalHealthSummary(user.firmId),
    getDocumentIntelligenceDashboardSummary(user.firmId),
    getPredictiveOperationalSnapshot(user.firmId),
    user.role === 'SuperAdmin' ? getEnterpriseFinancialIntelligenceSnapshot(user.firmId, user) : Promise.resolve(null),
  ]);

  const insights: ExecutiveDecisionInsight[] = [];

  if (ops.workloadRisk >= 65 || predictive.workloadImbalanceScore >= 65) {
    pushInsight(insights, {
      title: 'Workflow execution bottleneck',
      domain: 'workflow',
      severity: ops.workloadRisk >= 80 ? 'critical' : 'high',
      summary: 'Execution pressure is accumulating across overdue and imbalanced ownership chains.',
      evidence: [
        `Workload risk: ${ops.workloadRisk}`,
        `Workload imbalance: ${predictive.workloadImbalanceScore}`,
        `Overdue escalation chains: ${ops.integrity.counts.overdueEscalationChains}`,
      ],
      actionContext: 'Prioritize overdue clusters and rebalance owners before escalation growth.',
    });
  }

  if (ops.approvalPressure >= 55 || ops.integrity.counts.unresolvedApprovalClusters > 0) {
    pushInsight(insights, {
      title: 'Approval continuity risk',
      domain: 'approval',
      severity: ops.approvalPressure >= 75 ? 'critical' : 'high',
      summary: 'Approval throughput is constrained and likely to delay downstream billing/compliance workflows.',
      evidence: [
        `Approval pressure: ${ops.approvalPressure}`,
        `Unresolved approval clusters: ${ops.integrity.counts.unresolvedApprovalClusters}`,
        `Predictive governance risk: ${predictive.governanceRiskScore}`,
      ],
      actionContext: 'Escalate aged approvals and streamline reviewer queues.',
    });
  }

  if (ops.noticeExposure >= 45 || docs.unresolvedNotices > 0) {
    pushInsight(insights, {
      title: 'Notice and compliance pressure',
      domain: 'notice',
      severity: ops.noticeExposure >= 70 ? 'critical' : 'medium',
      summary: 'Notice backlog and compliance document pressure indicate elevated response risk.',
      evidence: [
        `Notice exposure: ${ops.noticeExposure}`,
        `Unresolved notices: ${docs.unresolvedNotices}`,
        `Overdue document workflows: ${docs.overdueDocumentWorkflows}`,
      ],
      actionContext: 'Prioritize high-risk notices and response documentation continuity.',
    });
  }

  if (docs.processingBacklog > 0 || docs.extractionFailures > 0) {
    pushInsight(insights, {
      title: 'Document continuity gap',
      domain: 'document',
      severity: docs.extractionFailures > 0 ? 'high' : 'medium',
      summary: 'Document orchestration and extraction continuity require intervention.',
      evidence: [
        `Processing backlog: ${docs.processingBacklog}`,
        `Extraction failures: ${docs.extractionFailures}`,
        `High-risk compliance documents: ${docs.highRiskComplianceDocuments}`,
      ],
      actionContext: 'Resolve extraction failures and enforce workflow/document linking.',
    });
  }

  if (financial) {
    if (financial.financialRisks.some((risk) => ['critical', 'high'].includes(risk.severity))) {
      pushInsight(insights, {
        title: 'Revenue realization pressure',
        domain: 'billing',
        severity: financial.balanceSheet.liquidityPressureScore >= 70 ? 'critical' : 'high',
        summary: 'Operational-financial continuity is stressed by receivables and unbilled execution.',
        evidence: [
          `Liquidity pressure: ${financial.balanceSheet.liquidityPressureScore}`,
          `Receivables pending: ${financial.balanceSheet.receivablesPending}`,
          `Profitability score: ${financial.pnl.profitabilityScore}`,
        ],
        actionContext: 'Accelerate invoicing from completed work and tighten receivable follow-through.',
      });
    }

    const collectionBase = financial.balanceSheet.receivablesPending - financial.balanceSheet.overdueCollections;
    if (financial.balanceSheet.payrollObligations > collectionBase) {
      pushInsight(insights, {
        title: 'Payroll to collections imbalance',
        domain: 'payroll',
        severity: 'medium',
        summary: 'Payroll obligation exposure is outpacing collection realization.',
        evidence: [
          `Payroll obligations: ${financial.balanceSheet.payrollObligations}`,
          `Receivables pending: ${financial.balanceSheet.receivablesPending}`,
          `Overdue collections: ${financial.balanceSheet.overdueCollections}`,
          `Net operating profit: ${financial.pnl.netOperatingProfit}`,
        ],
        actionContext: 'Sequence payout planning with receivable recovery and billing cadence.',
      });
    }
  }

  if (insights.length === 0) {
    pushInsight(insights, {
      title: 'Operational posture stable',
      domain: 'workflow',
      severity: 'low',
      summary: 'No elevated executive decision signals detected in current telemetry window.',
      evidence: [
        `Operational score: ${ops.score}`,
        `Governance risk: ${predictive.governanceRiskScore}`,
        `Workflow health: ${ops.workflowHealthScore}`,
      ],
      actionContext: 'Continue routine governance review and proactive monitoring.',
    });
  }

  const operationalSeverityScore = clamp(
    ops.workloadRisk * 0.25 +
    ops.approvalPressure * 0.2 +
    ops.noticeExposure * 0.15 +
    predictive.governanceRiskScore * 0.2 +
    predictive.billingPressureScore * 0.2
  );

  return {
    generatedAt: new Date().toISOString(),
    operationalSeverityScore,
    decisionHeat: {
      workflow: clamp((ops.workloadRisk + predictive.workloadImbalanceScore) / 2),
      approval: clamp((ops.approvalPressure + predictive.governanceRiskScore) / 2),
      financial: clamp(financial ? (financial.balanceSheet.liquidityPressureScore + predictive.billingPressureScore) / 2 : predictive.billingPressureScore),
      compliance: clamp((ops.noticeExposure + docs.highRiskComplianceDocuments * 8 + docs.overdueDocumentWorkflows * 10) / 2),
    },
    insights: insights.slice(0, 8),
  };
};
