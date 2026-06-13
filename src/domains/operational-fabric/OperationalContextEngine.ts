import { FabricDomain, FabricEvent, OperationalContextEnvelope } from './types';

export class OperationalContextEngine {
  private readonly contexts = new Map<string, OperationalContextEnvelope>();

  upsertContext(input: Omit<OperationalContextEnvelope, 'updatedAt'>): OperationalContextEnvelope {
    const merged: OperationalContextEnvelope = {
      ...input,
      updatedAt: new Date().toISOString(),
      activeDomains: Array.from(new Set(input.activeDomains)),
    };
    this.contexts.set(this.key(input.tenantId, input.entityId), merged);
    return merged;
  }

  synchronizeFromEvent(event: FabricEvent): OperationalContextEnvelope {
    const current = this.contexts.get(this.key(event.tenantId)) ?? {
      tenantId: event.tenantId,
      riskLevel: 'low' as const,
      activeDomains: [],
      kpis: {},
      metadata: {},
      updatedAt: new Date().toISOString(),
    };
    const activeDomains = Array.from(new Set([...current.activeDomains, event.domain]));
    const riskLevel = this.inferRiskLevel(activeDomains, event.tags ?? []);
    const synchronized: OperationalContextEnvelope = {
      ...current,
      activeDomains,
      riskLevel,
      metadata: { ...current.metadata, lastEventName: event.name, lastCorrelationId: event.correlationId },
      updatedAt: new Date().toISOString(),
    };
    this.contexts.set(this.key(event.tenantId), synchronized);
    return synchronized;
  }

  getContext(tenantId: string, entityId?: string): OperationalContextEnvelope | null {
    return this.contexts.get(this.key(tenantId, entityId)) ?? this.contexts.get(this.key(tenantId)) ?? null;
  }

  private inferRiskLevel(activeDomains: FabricDomain[], tags: string[]): OperationalContextEnvelope['riskLevel'] {
    if (tags.includes('critical') || activeDomains.length >= 8) return 'critical';
    if (tags.includes('high') || activeDomains.length >= 6) return 'high';
    if (tags.includes('medium') || activeDomains.length >= 4) return 'medium';
    return 'low';
  }

  private key(tenantId: string, entityId?: string): string {
    return entityId ? `${tenantId}:${entityId}` : tenantId;
  }
}
