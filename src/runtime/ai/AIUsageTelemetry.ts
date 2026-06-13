import { AIUsageEvent } from './types';

export class AIUsageTelemetry {
  private events: AIUsageEvent[] = [];

  track(event: AIUsageEvent): void {
    this.events.push(event);
  }

  listByTenant(tenantId: string): AIUsageEvent[] {
    return this.events.filter((event) => event.tenantId === tenantId);
  }
}

