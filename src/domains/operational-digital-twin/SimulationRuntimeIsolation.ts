import { SimulationScenario } from './types';

export class SimulationRuntimeIsolation {
  private readonly queue = new Map<string, number[]>();
  private readonly cache = new Map<string, { at: number; payload: unknown }>();
  private readonly maxRunsPerMinute = 24;

  canRun(scenario: SimulationScenario): boolean {
    const now = Date.now();
    const runs = (this.queue.get(scenario.tenantId) ?? []).filter((stamp) => now - stamp < 60_000);
    if (runs.length >= this.maxRunsPerMinute) return false;
    runs.push(now);
    this.queue.set(scenario.tenantId, runs);
    return true;
  }

  getCached<T>(key: string, ttlMs = 120_000): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.at > ttlMs) return null;
    return item.payload as T;
  }

  setCached(key: string, payload: unknown): void {
    this.cache.set(key, { at: Date.now(), payload });
  }
}
