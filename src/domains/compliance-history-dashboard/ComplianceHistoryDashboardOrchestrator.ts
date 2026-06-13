import { ComplianceHistoryDashboardInput, ComplianceHistoryDashboardModel } from './types';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const buildComplianceHistoryDashboard = (
  input: ComplianceHistoryDashboardInput
): ComplianceHistoryDashboardModel => {
  const { knowledge } = input;
  const highRecurring = knowledge.riskPatterns.filter((item) => item.severity === 'high').length;
  const deterioratingVendors = knowledge.vendorHistory.filter((vendor) => vendor.riskTrend === 'deteriorating').length;

  return {
    trendCards: [
      {
        title: 'Recurring Risk Patterns',
        value: `${knowledge.riskPatterns.length}`,
        tone: highRecurring > 0 ? 'warning' : 'neutral',
      },
      {
        title: 'Vendor Stability Index',
        value: `${clamp(knowledge.vendorHistory.reduce((sum, item) => sum + item.complianceStability, 0) / Math.max(1, knowledge.vendorHistory.length))}`,
        tone: deterioratingVendors > 1 ? 'warning' : 'positive',
      },
      {
        title: 'AI Recommendation Effectiveness',
        value: `${clamp(knowledge.aiLearningMemory.reduce((sum, item) => sum + item.effectivenessScore, 0) / Math.max(1, knowledge.aiLearningMemory.length))}%`,
        tone: 'neutral',
      },
    ],
    recurringRiskHeatmap: knowledge.riskPatterns.map((pattern) => ({
      label: pattern.pattern,
      intensity: clamp(pattern.recurringCount * 22),
    })),
    vendorHistoryTable: knowledge.vendorHistory.map((vendor) => ({
      vendor: vendor.vendorName,
      trustScore: vendor.trustScore,
      trend: vendor.riskTrend,
    })),
    slaHistory: knowledge.filingCycles.map((cycle) => ({
      label: cycle.filingPeriod,
      value: cycle.workloadPressure,
    })),
    timelineHighlights: knowledge.intelligenceTimeline.map((item) => ({
      category: item.category,
      message: item.message,
      timestamp: item.timestamp,
    })),
    explanatoryNarrative:
      highRecurring > 0
        ? 'Historical intelligence indicates recurring risk clusters requiring proactive intervention before SLA windows tighten.'
        : 'Historical intelligence indicates stable progression with isolated risk spikes and controlled remediation performance.',
  };
};
