import { RuntimeEventBus } from '../../runtime/events/RuntimeEventBus';
import { FabricDomain, FabricEvent } from './types';

type BusSubscriber = (event: FabricEvent) => void | Promise<void>;

export class CrossDomainIntelligenceBus {
  private readonly runtimeBus = new RuntimeEventBus();
  private readonly subscribers = new Set<BusSubscriber>();
  private readonly byDomain = new Map<FabricDomain, FabricEvent[]>();
  private readonly correlationIndex = new Map<string, FabricEvent[]>();

  async publish(event: FabricEvent): Promise<void> {
    const domainEvents = this.byDomain.get(event.domain) ?? [];
    domainEvents.push(event);
    this.byDomain.set(event.domain, domainEvents);

    const correlated = this.correlationIndex.get(event.correlationId) ?? [];
    correlated.push(event);
    this.correlationIndex.set(event.correlationId, correlated);

    await this.runtimeBus.publish({
      id: event.id,
      name: event.name,
      version: 1,
      tenantId: event.tenantId,
      payload: event.payload,
      correlationId: event.correlationId,
      occurredAt: event.timestamp,
    });

    for (const subscriber of this.subscribers) {
      await subscriber(event);
    }
  }

  subscribe(subscriber: BusSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  listByDomain(domain: FabricDomain): FabricEvent[] {
    return [...(this.byDomain.get(domain) ?? [])];
  }

  listByCorrelation(correlationId: string): FabricEvent[] {
    return [...(this.correlationIndex.get(correlationId) ?? [])];
  }

  listAll(): FabricEvent[] {
    return [...this.byDomain.values()].flat().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
