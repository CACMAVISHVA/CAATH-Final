import { GSTIntelligenceEngineResult } from '../gst-intelligence';
import {
  AIResolutionRecommendation,
  ComplianceIssue,
  GSTResolutionCenterResult,
  ResolutionTaskIntent,
  ResolutionWorkflow,
} from './types';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const now = () => new Date().toISOString();

const mapSeverity = (score: number): 'low' | 'medium' | 'high' => {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
};

const deriveIssues = (engine: GSTIntelligenceEngineResult): ComplianceIssue[] => {
  const issues: ComplianceIssue[] = [];
  if (engine.execution.reconciliation.missingInvoices.length > 0) {
    issues.push({
      id: 'issue-itc-mismatch',
      title: 'ITC mismatch cluster detected',
      summary: `${engine.execution.reconciliation.missingInvoices.length} missing ITC invoice(s) require reconciliation.`,
      source: 'reconciliation',
      severity: mapSeverity(engine.execution.reconciliation.missingInvoices.length * 6),
      state: 'detected',
      ownerRole: 'gst_staff',
      slaHours: 24,
      detectedAt: now(),
    });
  }
  if (Math.abs(engine.execution.variance.taxableTurnoverVariance) > 8 || Math.abs(engine.execution.variance.liabilityVariance) > 8) {
    issues.push({
      id: 'issue-filing-discrepancy',
      title: 'Filing discrepancy requires correction',
      summary: `Variance detected (taxable ${engine.execution.variance.taxableTurnoverVariance}%, liability ${engine.execution.variance.liabilityVariance}%).`,
      source: 'variance',
      severity: mapSeverity(Math.abs(engine.execution.variance.taxableTurnoverVariance) + Math.abs(engine.execution.variance.liabilityVariance)),
      state: 'assigned',
      ownerRole: 'senior_reviewer',
      slaHours: 16,
      detectedAt: now(),
    });
  }
  if (engine.execution.vendorRisk.score < 75) {
    issues.push({
      id: 'issue-vendor-risk',
      title: 'Vendor reconciliation risk elevated',
      summary: `${engine.execution.vendorRisk.highRiskVendors.length} high-risk vendor(s) identified for follow-up.`,
      source: 'vendor_risk',
      severity: mapSeverity(100 - engine.execution.vendorRisk.score),
      state: 'investigating',
      ownerRole: 'gst_staff',
      slaHours: 36,
      detectedAt: now(),
    });
  }
  if (engine.execution.auditRisk.auditRiskScore < 70) {
    issues.push({
      id: 'issue-audit-exposure',
      title: 'Audit preparation workflow required',
      summary: `${engine.execution.auditRisk.scrutinyTriggers.length} scrutiny trigger(s) active.`,
      source: 'audit_risk',
      severity: mapSeverity(100 - engine.execution.auditRisk.auditRiskScore),
      state: 'escalated',
      ownerRole: 'audit_lead',
      slaHours: 12,
      detectedAt: now(),
    });
  }
  if (engine.execution.anomalies.anomalies.length > 0) {
    issues.push({
      id: 'issue-anomaly-cluster',
      title: 'Anomaly investigation needed',
      summary: `${engine.execution.anomalies.anomalies.length} anomaly signal(s) detected in GST execution.`,
      source: 'anomaly',
      severity: mapSeverity(100 - engine.execution.anomalies.anomalyScore),
      state: 'awaiting_response',
      ownerRole: 'operations_manager',
      slaHours: 20,
      detectedAt: now(),
    });
  }
  return issues;
};

export const buildGSTResolutionCenter = (engine: GSTIntelligenceEngineResult): GSTResolutionCenterResult => {
  const issues = deriveIssues(engine);
  const workflows: ResolutionWorkflow[] = issues.map((issue) => ({
    workflowId: `wf-${issue.id}`,
    issueId: issue.id,
    workflowType:
      issue.source === 'reconciliation'
        ? 'itc_mismatch_resolution'
        : issue.source === 'variance'
          ? 'filing_discrepancy_correction'
          : issue.source === 'vendor_risk'
            ? 'vendor_reconciliation'
            : issue.source === 'audit_risk'
              ? 'audit_preparation'
              : 'anomaly_investigation',
    state: issue.state,
    assignedToRole: issue.ownerRole,
    approvalRequired: issue.severity === 'high',
    escalationPath: [issue.ownerRole, 'senior_reviewer', 'operations_manager'],
    notes: ['Created from GST intelligence execution.', 'Governed workflow with audit lineage enabled.'],
  }));

  const aiRecommendations: AIResolutionRecommendation[] = issues.map((issue) => ({
    issueId: issue.id,
    recommendation:
      issue.source === 'vendor_risk'
        ? 'Recommend vendor reconciliation before ITC claim and request missing clarifications.'
        : issue.source === 'audit_risk'
          ? 'High-risk mismatch should be escalated to senior reviewer and audit lead.'
          : 'Run structured compliance remediation workflow with owner assignment.',
    rationale: issue.summary,
    suggestedAction:
      issue.severity === 'high'
        ? 'escalate'
        : issue.source === 'vendor_risk'
          ? 'request_vendor_response'
          : 'assign',
    confidence: clamp(78 + (issue.severity === 'high' ? 12 : issue.severity === 'medium' ? 6 : 0)),
    governanceNote: 'AI recommendation is assistive and requires role-based operational approval.',
  }));

  const taskIntents: ResolutionTaskIntent[] = issues.map((issue) => ({
    title: issue.title,
    priority: issue.severity,
    taskType:
      issue.source === 'reconciliation'
        ? 'reconciliation'
        : issue.source === 'vendor_risk'
          ? 'vendor_followup'
          : issue.source === 'audit_risk'
            ? 'audit_investigation'
            : issue.severity === 'high'
              ? 'escalation'
              : 'compliance_review',
    issueId: issue.id,
  }));

  const vendorCollaboration = issues
    .filter((issue) => issue.source === 'vendor_risk')
    .map((issue, index) => ({
      issueId: issue.id,
      vendorName: engine.execution.vendorRisk.highRiskVendors[index]?.vendorName || `Vendor ${index + 1}`,
      status: 'requested' as const,
      lastUpdate: now(),
      requestedDocuments: ['Invoice copy', 'GST filing acknowledgment', 'ITC ledger extract'],
    }));

  const slaInsights = issues.map((issue) => {
    const agingHours = issue.state === 'detected' ? 1 : issue.state === 'assigned' ? 4 : 8;
    const urgencyScore = clamp((issue.severity === 'high' ? 80 : issue.severity === 'medium' ? 60 : 35) + agingHours);
    return {
      issueId: issue.id,
      deadlineAt: new Date(Date.now() + issue.slaHours * 3600000).toISOString(),
      agingHours,
      urgencyScore,
      breachRisk: urgencyScore >= 85 ? 'high' as const : urgencyScore >= 65 ? 'medium' as const : 'low' as const,
    };
  });

  const timeline = issues.flatMap((issue) => ([
    { issueId: issue.id, message: `${issue.title} detected and registered in compliance issue center.`, timestamp: now() },
    { issueId: issue.id, message: `Workflow ${workflows.find((wf) => wf.issueId === issue.id)?.workflowType || 'compliance_remediation'} active.`, timestamp: now() },
    { issueId: issue.id, message: `AI recommendation generated with governance controls.`, timestamp: now() },
  ]));

  const highRiskOpenIssues = issues.filter((issue) => issue.severity === 'high' && !['resolved', 'closed'].includes(issue.state)).length;
  const slaBreachesLikely = slaInsights.filter((item) => item.breachRisk === 'high').length;
  const remediationEfficiencyScore = clamp(100 - highRiskOpenIssues * 14 - slaBreachesLikely * 10);

  return {
    issues,
    workflows,
    aiRecommendations,
    taskIntents,
    vendorCollaboration,
    slaInsights,
    timeline,
    executiveSummary: {
      openIssues: issues.filter((issue) => !['resolved', 'closed'].includes(issue.state)).length,
      highRiskOpenIssues,
      slaBreachesLikely,
      remediationEfficiencyScore,
    },
    governance: {
      auditable: true,
      permissionAware: true,
      explainable: true,
      lineageLinked: true,
    },
    aiNarratives: [
      {
        id: 'resolution-center-summary',
        title: 'AI Resolution Summary',
        summary: `${issues.length} compliance issue(s) require governed resolution actions.`,
        recommendation: highRiskOpenIssues > 0
          ? 'Prioritize high-risk issues, escalate audit-linked items, and complete vendor follow-ups first.'
          : 'Proceed with assigned remediation workflows and close low-risk issues within SLA.',
        priority: highRiskOpenIssues > 0 ? 'high' : 'medium',
        governanceNote: 'Narrative is derived from traceable workflow and intelligence outputs.',
      },
    ],
    runtime: {
      queueAwareExecution: true,
      throttledNotifications: true,
      asyncWorkflowHandling: true,
      gracefulDegradation: true,
    },
  };
};
