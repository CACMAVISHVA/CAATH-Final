import { CognitiveExecutionInput } from './types';

export class CognitiveExecutionSafetyController {
  private lastRunByTenant = new Map<string, number>();
  private cache = new Map<string, CognitiveExecutionInput['queue']>();
  private readonly stabilizationWindowMs = 45_000;

  canRun(tenantId: string): boolean {
    const now = Date.now();
    const last = this.lastRunByTenant.get(tenantId) ?? 0;
    if (now - last < this.stabilizationWindowMs) return false;
    this.lastRunByTenant.set(tenantId, now);
    return true;
  }

  getCachedQueue(tenantId: string) {
    return this.cache.get(tenantId) ?? null;
  }

  setCachedQueue(tenantId: string, queue: CognitiveExecutionInput['queue']): void {
    this.cache.set(tenantId, queue.slice(0, 20));
  }
}
