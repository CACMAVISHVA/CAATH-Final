import { CorrelationInsight, FabricDomain, FabricEvent } from './types';

export class CrossDomainCorrelationEngine {
  correlate(tenantId: string, events: FabricEvent[]): CorrelationInsight[] {
    if (events.length === 0) return [];
    const byCorrelation = new Map<string, FabricEvent[]>();
    for (const event of events) {
      const group = byCorrelation.get(event.correlationId) ?? [];
      group.push(event);
      byCorrelation.set(event.correlationId, group);
    }

    return Array.from(byCorrelation.entries())
      .filter(([, group]) => group.length >= 2)
      .map(([correlationId, group]) => {
        const uniqueDomains = Array.from(new Set(group.map((event) => event.domain)));
        const severity = this.severity(uniqueDomains.length);
        const confidence = Math.min(96, 50 + (group.length * 8) + (uniqueDomains.length * 6));
        return {
          id: `corr_${tenantId}_${correlationId}`,
          tenantId,
          signal: `Cross-domain correlation detected across ${uniqueDomains.length} domains`,
          confidence,
          severity,
          relatedDomains: uniqueDomains,
          evidence: group.slice(0, 5).map((event) => `${event.domain}:${event.name}`),
          recommendation: this.recommendation(uniqueDomains),
          createdAt: new Date().toISOString(),
        };
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  private severity(domainCount: number): CorrelationInsight['severity'] {
    if (domainCount >= 6) return 'critical';
    if (domainCount >= 4) return 'high';
    if (domainCount >= 3) return 'medium';
    return 'low';
  }

  private recommendation(domains: FabricDomain[]): string {
    if (domains.includes('vendor_intelligence') && domains.includes('escalations')) {
      return 'Repeated vendor risk correlates with escalation pressure. Trigger SLA-protected remediation workflow.';
    }
    if (domains.includes('predictive_operations') && domains.includes('workflows')) {
      return 'Predictive and workflow signals align. Prioritize queue balancing and bottleneck prevention.';
    }
    return 'Start coordinated cross-domain review with governance-safe routing and context propagation.';
  }
}
