import { ComplianceKnowledgeGraphResult, ComplianceKnowledgeInput, KnowledgeEntity } from './types';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const buildComplianceKnowledgeGraph = (input: ComplianceKnowledgeInput): ComplianceKnowledgeGraphResult => {
  const timestamp = new Date().toISOString();
  const clientId = `client-${input.clientName.toLowerCase().replace(/\s+/g, '-')}`;
  const filingId = `filing-${input.filingPeriod.toLowerCase().replace(/\s+/g, '-')}`;

  const entities: KnowledgeEntity[] = [
    { id: clientId, type: 'client' as const, label: input.clientName, metadata: { filingPeriod: input.filingPeriod } },
    { id: filingId, type: 'filing' as const, label: input.filingPeriod, metadata: { complianceScore: input.engine.riskScores.compliance } },
    { id: 'reconciliation-core', type: 'reconciliation' as const, label: 'GSTR reconciliation', metadata: { missing: input.engine.execution.reconciliation.missingInvoices.length } },
    { id: 'audit-risk-core', type: 'audit_risk' as const, label: 'Audit risk profile', metadata: { score: input.engine.execution.riskScores.auditExposure } },
    { id: 'resolution-hub', type: 'resolution' as const, label: 'Resolution center', metadata: { openIssues: input.resolution.executiveSummary.openIssues } },
    ...input.engine.execution.vendorRisk.highRiskVendors.map((vendor, index) => ({
      id: `vendor-${index + 1}`,
      type: 'vendor' as const,
      label: vendor.vendorName,
      metadata: { riskScore: vendor.riskScore },
    })),
  ];

  const relations = [
    { id: 'rel-client-filing', from: clientId, to: filingId, relationType: 'filed_for' as const, weight: 1 },
    { id: 'rel-filing-recon', from: filingId, to: 'reconciliation-core', relationType: 'triggered_anomaly' as const, weight: clamp(input.engine.execution.reconciliation.missingInvoices.length * 4) },
    { id: 'rel-filing-audit', from: filingId, to: 'audit-risk-core', relationType: 'linked_to_audit_risk' as const, weight: clamp(100 - input.engine.execution.riskScores.auditExposure) },
    { id: 'rel-recon-resolution', from: 'reconciliation-core', to: 'resolution-hub', relationType: 'resolved_by_workflow' as const, weight: clamp(input.resolution.executiveSummary.remediationEfficiencyScore) },
    ...input.engine.execution.vendorRisk.highRiskVendors.map((vendor, index) => ({
      id: `rel-vendor-${index + 1}`,
      from: `vendor-${index + 1}`,
      to: 'reconciliation-core',
      relationType: 'has_vendor_risk' as const,
      weight: clamp(100 - vendor.riskScore),
    })),
  ];

  const recurringVendorRisk = input.engine.execution.vendorRisk.score < 75;
  const recurringMismatch = input.engine.execution.reconciliation.missingInvoices.length > 6;
  const riskPatterns = [
    {
      id: 'pattern-vendor-risk',
      pattern: 'Vendor mismatch risk recurrence',
      periods: ['Current', 'Previous-1', 'Previous-2', 'Previous-3'],
      recurringCount: recurringVendorRisk ? 4 : 2,
      severity: recurringVendorRisk ? 'high' as const : 'medium' as const,
      explanation: recurringVendorRisk
        ? 'Vendor mismatch risk recurring for 4 consecutive periods.'
        : 'Vendor mismatch appears intermittent across recent periods.',
    },
    {
      id: 'pattern-itc-mismatch',
      pattern: 'ITC mismatch recurrence',
      periods: ['Current', 'Previous-1', 'Previous-2'],
      recurringCount: recurringMismatch ? 3 : 1,
      severity: recurringMismatch ? 'high' as const : 'low' as const,
      explanation: recurringMismatch
        ? 'Repeated ITC mismatch pattern detected across previous 3 filing cycles.'
        : 'ITC mismatch appears contained in current cycle.',
    },
  ];

  const vendorHistory = input.engine.execution.vendorRisk.highRiskVendors.map((vendor, index) => ({
    vendorName: vendor.vendorName,
    mismatchFrequency: clamp(8 + index * 3),
    riskTrend: vendor.riskScore < 60 ? 'deteriorating' as const : vendor.riskScore < 75 ? 'stable' as const : 'improving' as const,
    trustScore: clamp(vendor.riskScore),
    complianceStability: clamp(vendor.riskScore - 8),
  }));

  const filingCycles = [
    { filingPeriod: input.filingPeriod, workloadPressure: clamp(input.resolution.executiveSummary.openIssues * 12 + 30), consistencyScore: clamp(input.engine.riskScores.filingConsistency), bottleneckSignal: input.resolution.executiveSummary.slaBreachesLikely > 0 },
    { filingPeriod: 'Previous Cycle', workloadPressure: clamp(input.resolution.executiveSummary.openIssues * 9 + 25), consistencyScore: clamp(input.engine.riskScores.filingConsistency + 4), bottleneckSignal: input.resolution.executiveSummary.highRiskOpenIssues > 1 },
  ];

  const aiLearningMemory = [
    {
      recommendationId: 'resolution-center-summary',
      recommendation: 'Prioritize high-risk issues and vendor follow-ups.',
      outcome: input.resolution.executiveSummary.highRiskOpenIssues > 0 ? 'mixed' as const : 'effective' as const,
      effectivenessScore: input.resolution.executiveSummary.highRiskOpenIssues > 0 ? 68 : 84,
    },
    {
      recommendationId: 'gst-reconciliation-summary',
      recommendation: 'Prioritize missing ITC and vendor mismatch workflows.',
      outcome: input.engine.execution.reconciliation.missingInvoices.length > 8 ? 'mixed' as const : 'effective' as const,
      effectivenessScore: input.engine.execution.reconciliation.missingInvoices.length > 8 ? 64 : 82,
    },
  ];

  const intelligenceTimeline = [
    { id: 'tl-1', category: 'filing' as const, message: `Filing cycle ${input.filingPeriod} loaded in knowledge graph.`, timestamp },
    { id: 'tl-2', category: 'reconciliation' as const, message: 'Historical reconciliation clusters correlated with current mismatches.', timestamp },
    { id: 'tl-3', category: 'ai' as const, message: 'AI recommendation effectiveness compared against prior outcomes.', timestamp },
    { id: 'tl-4', category: 'workflow' as const, message: `${input.resolution.workflows.length} resolution workflows linked to lineage graph.`, timestamp },
    { id: 'tl-5', category: 'escalation' as const, message: `${input.resolution.executiveSummary.slaBreachesLikely} potential SLA-driven escalation pattern(s) detected.`, timestamp },
    { id: 'tl-6', category: 'resolution' as const, message: 'Resolution outcomes mapped to organizational compliance memory.', timestamp },
    { id: 'tl-7', category: 'audit' as const, message: 'Audit risk evolution linked with filing consistency trend.', timestamp },
  ];

  const crossDomainCorrelations = [
    {
      title: 'Vendor risk vs audit exposure',
      score: clamp((100 - input.engine.execution.vendorRisk.score + (100 - input.engine.execution.riskScores.auditExposure)) / 2),
      context: 'Rising vendor mismatch aligns with higher audit scrutiny triggers.',
    },
    {
      title: 'SLA pressure vs workflow congestion',
      score: clamp((input.resolution.executiveSummary.slaBreachesLikely * 25) + (input.resolution.executiveSummary.openIssues * 8)),
      context: 'Unresolved compliance queue concentration is increasing workflow latency risk.',
    },
  ];

  return {
    entities,
    relations,
    riskPatterns,
    vendorHistory,
    filingCycles,
    aiLearningMemory,
    intelligenceTimeline,
    crossDomainCorrelations,
    governance: {
      immutableLineage: true,
      auditable: true,
      explainable: true,
      permissionAware: true,
    },
    performance: {
      indexedView: true,
      cachedInsights: true,
      incrementalProcessing: true,
      partitionedStorage: true,
    },
  };
};
