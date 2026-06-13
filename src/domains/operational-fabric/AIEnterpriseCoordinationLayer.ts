import { CorrelationInsight, ExecutiveOperationalSnapshot, OperationalContextEnvelope } from './types';

export class AIEnterpriseCoordinationLayer {
  summarize(input: {
    context: OperationalContextEnvelope | null;
    correlations: CorrelationInsight[];
    workloadIndex: number;
  }): { summary: string; guidance: string[] } {
    const risk = input.context?.riskLevel ?? 'low';
    const highSignals = input.correlations.filter((item) => item.severity === 'high' || item.severity === 'critical');
    const summary = `Enterprise posture is ${risk}. ${highSignals.length} high-priority cross-domain correlations detected.`;
    const guidance = [
      'Prioritize shared workflows with highest correlation confidence.',
      'Resolve vendor-risk and escalation overlap through a single governance lane.',
      'Use queue-aware propagation to prevent coordination bottlenecks.',
    ];
    if (input.workloadIndex >= 75) {
      guidance.unshift('Workload pressure is elevated. Trigger workload redistribution recommendations.');
    }
    return { summary, guidance };
  }

  buildExecutiveSummary(snapshot: ExecutiveOperationalSnapshot): string {
    const dominant = [...snapshot.heatmap].sort((a, b) => b.intensity - a.intensity)[0];
    return `Top pressure domain: ${dominant?.domain ?? 'none'}. ${snapshot.topRisks.length} correlated risks require executive attention.`;
  }
}
