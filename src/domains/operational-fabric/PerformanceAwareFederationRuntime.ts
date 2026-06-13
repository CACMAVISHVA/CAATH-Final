import { FabricEvent } from './types';

export class PerformanceAwareFederationRuntime {
  private readonly dedupe = new Set<string>();
  private readonly recentByTenant = new Map<string, number[]>();
  private readonly throttlePerMinute = 600;

  shouldPropagate(event: FabricEvent): boolean {
    const dedupeKey = `${event.id}:${event.correlationId}`;
    if (this.dedupe.has(dedupeKey)) return false;
    this.dedupe.add(dedupeKey);

    const now = Date.now();
    const series = (this.recentByTenant.get(event.tenantId) ?? []).filter((stamp) => now - stamp < 60_000);
    if (series.length >= this.throttlePerMinute) return false;
    series.push(now);
    this.recentByTenant.set(event.tenantId, series);
    return true;
  }
}
