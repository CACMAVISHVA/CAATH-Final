import { FabricSearchQuery, FabricSearchResult } from './types';
import { CrossDomainIntelligenceBus } from './CrossDomainIntelligenceBus';
import { EnterpriseOperationalMemoryFabric } from './EnterpriseOperationalMemoryFabric';

export class OperationalIntelligenceSearchFabric {
  constructor(
    private readonly bus: CrossDomainIntelligenceBus,
    private readonly memory: EnterpriseOperationalMemoryFabric,
  ) {}

  search(query: FabricSearchQuery): FabricSearchResult[] {
    const normalized = query.text.trim().toLowerCase();
    if (!normalized) return [];
    const domains = query.domains ?? [];
    const domainSet = new Set(domains);
    const eventHits = this.bus
      .listAll()
      .filter((event) => event.tenantId === query.tenantId)
      .filter((event) => (domainSet.size === 0 ? true : domainSet.has(event.domain)))
      .filter((event) => `${event.name} ${JSON.stringify(event.payload)}`.toLowerCase().includes(normalized))
      .map<FabricSearchResult>((event) => ({
        id: event.id,
        type: 'event',
        title: event.name,
        summary: `Event from ${event.domain}`,
        score: 0.82,
        domain: event.domain,
        timestamp: event.timestamp,
      }));

    const memoryHits = this.memory.search(query.tenantId, query.text).map<FabricSearchResult>((item) => ({
      id: item.id,
      type: 'memory',
      title: item.title,
      summary: item.summary,
      score: 0.88,
      domain: item.sourceDomain,
      timestamp: item.createdAt,
    }));

    return [...eventHits, ...memoryHits]
      .sort((a, b) => b.score - a.score || b.timestamp.localeCompare(a.timestamp))
      .slice(0, query.limit ?? 25);
  }
}
