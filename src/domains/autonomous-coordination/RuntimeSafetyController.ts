export class RuntimeSafetyController {
  private readonly actionWindow = new Map<string, number[]>();
  private readonly maxActionsPerWindow = 16;
  private readonly windowMs = 5 * 60_000;

  canApply(tenantId: string): boolean {
    const now = Date.now();
    const history = (this.actionWindow.get(tenantId) ?? []).filter((stamp) => now - stamp < this.windowMs);
    if (history.length >= this.maxActionsPerWindow) return false;
    history.push(now);
    this.actionWindow.set(tenantId, history);
    return true;
  }
}
