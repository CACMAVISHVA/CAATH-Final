type TenantBucket = {
  windowStartedAt: number;
  count: number;
};

export class AIRuntimeSafeguards {
  private buckets = new Map<string, TenantBucket>();

  constructor(
    private readonly maxCallsPerWindow = 8,
    private readonly windowMs = 60_000
  ) {}

  allowExecution(tenantId: string) {
    const now = Date.now();
    const current = this.buckets.get(tenantId);
    if (!current || now - current.windowStartedAt > this.windowMs) {
      this.buckets.set(tenantId, { windowStartedAt: now, count: 1 });
      return { allowed: true, degraded: false };
    }
    if (current.count >= this.maxCallsPerWindow) {
      return { allowed: false, degraded: true };
    }
    current.count += 1;
    this.buckets.set(tenantId, current);
    return { allowed: true, degraded: false };
  }
}
