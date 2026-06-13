import { FabricEvent } from './types';

export class RuntimeFederationGovernance {
  private readonly allowedByRole: Record<string, string[]> = {
    admin: ['*'],
    manager: ['gst', 'workflows', 'predictive_operations', 'notifications', 'dashboards', 'telemetry', 'compliance'],
    staff: ['workflows', 'notifications', 'tasks', 'telemetry'],
    reviewer: ['compliance', 'gst', 'telemetry', 'dashboards'],
  };

  canRoute(role: string, event: FabricEvent): boolean {
    const allowed = this.allowedByRole[role] ?? [];
    return allowed.includes('*') || allowed.includes(event.domain);
  }

  lineage(event: FabricEvent): string {
    return `${event.tenantId}:${event.correlationId}:${event.domain}:${event.name}`;
  }
}
