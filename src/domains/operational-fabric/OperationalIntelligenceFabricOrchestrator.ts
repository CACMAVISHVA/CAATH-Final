import { AIEnterpriseCoordinationLayer } from './AIEnterpriseCoordinationLayer';
import { CrossDomainCorrelationEngine } from './CrossDomainCorrelationEngine';
import { CrossDomainIntelligenceBus } from './CrossDomainIntelligenceBus';
import { EnterpriseOperationalGraph } from './EnterpriseOperationalGraph';
import { EnterpriseOperationalMemoryFabric } from './EnterpriseOperationalMemoryFabric';
import { OperationalContextEngine } from './OperationalContextEngine';
import { OperationalIntelligenceSearchFabric } from './OperationalIntelligenceSearchFabric';
import { PerformanceAwareFederationRuntime } from './PerformanceAwareFederationRuntime';
import { RuntimeFederationGovernance } from './RuntimeFederationGovernance';
import { UnifiedOperationalTimeline } from './UnifiedOperationalTimeline';
import {
  CorrelationInsight,
  ExecutiveOperationalSnapshot,
  FabricEvent,
  FabricSearchQuery,
  FabricSearchResult,
  OperationalMemoryRecord,
  UnifiedTimelineItem,
} from './types';

export class OperationalIntelligenceFabricOrchestrator {
  private readonly bus = new CrossDomainIntelligenceBus();
  private readonly context = new OperationalContextEngine();
  private readonly memory = new EnterpriseOperationalMemoryFabric();
  private readonly correlations = new CrossDomainCorrelationEngine();
  private readonly timeline = new UnifiedOperationalTimeline();
  private readonly graph = new EnterpriseOperationalGraph();
  private readonly governance = new RuntimeFederationGovernance();
  private readonly performance = new PerformanceAwareFederationRuntime();
  private readonly ai = new AIEnterpriseCoordinationLayer();
  private readonly searchFabric = new OperationalIntelligenceSearchFabric(this.bus, this.memory);

  async routeEvent(role: string, event: FabricEvent): Promise<boolean> {
    if (!this.governance.canRoute(role, event)) return false;
    if (!this.performance.shouldPropagate(event)) return false;
    this.context.synchronizeFromEvent(event);
    this.graph.upsertNode({
      id: event.id,
      tenantId: event.tenantId,
      type: 'workflow',
      label: event.name,
      metadata: { domain: event.domain, lineage: this.governance.lineage(event) },
    });
    await this.bus.publish(event);
    return true;
  }

  appendMemory(record: OperationalMemoryRecord): void {
    this.memory.append(record);
  }

  getCorrelations(tenantId: string): CorrelationInsight[] {
    const events = this.bus.listAll().filter((event) => event.tenantId === tenantId);
    return this.correlations.correlate(tenantId, events);
  }

  getUnifiedTimeline(tenantId: string, limit = 200): UnifiedTimelineItem[] {
    return this.timeline.build(tenantId, this.bus.listAll(), limit);
  }

  search(query: FabricSearchQuery): FabricSearchResult[] {
    return this.searchFabric.search(query);
  }

  getExecutiveSnapshot(tenantId: string): ExecutiveOperationalSnapshot {
    const events = this.bus.listAll().filter((event) => event.tenantId === tenantId);
    const correlations = this.correlations.correlate(tenantId, events).slice(0, 5);
    const domainCounts = new Map<string, number>();
    for (const event of events) {
      domainCounts.set(event.domain, (domainCounts.get(event.domain) ?? 0) + 1);
    }
    const heatmap = Array.from(domainCounts.entries()).map(([domain, intensity]) => ({
      domain: domain as ExecutiveOperationalSnapshot['heatmap'][number]['domain'],
      intensity,
    }));
    const context = this.context.getContext(tenantId);
    const workloadIndex = Math.min(100, events.length);
    const aiLayer = this.ai.summarize({ context, correlations, workloadIndex });

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      kpis: {
        federatedEventCount: events.length,
        activeDomainCount: heatmap.length,
        memoryRecordCount: this.memory.list(tenantId).length,
        highRiskCorrelationCount: correlations.filter((item) => item.severity === 'high' || item.severity === 'critical').length,
      },
      heatmap,
      topRisks: correlations,
      aiSummary: aiLayer.summary,
      predictiveInsights: aiLayer.guidance,
    };
  }

  getGraphSnapshot(tenantId: string) {
    return this.graph.snapshot(tenantId);
  }
}

export const operationalIntelligenceFabricOrchestrator = new OperationalIntelligenceFabricOrchestrator();
