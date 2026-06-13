import { operationalDigitalTwinOrchestrator } from '../operational-digital-twin';
import { FabricDomain, operationalIntelligenceFabricOrchestrator } from '../operational-fabric';
import { SynchronizationState } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export class OperationalSynchronizationFabric {
  synchronize(tenantId: string): SynchronizationState {
    const executive = operationalIntelligenceFabricOrchestrator.getExecutiveSnapshot(tenantId);
    const twinState = operationalDigitalTwinOrchestrator.modelState(tenantId);
    const isFabricDomain = (domain: string): domain is FabricDomain =>
      [
        'gst',
        'ai_orchestration',
        'predictive_operations',
        'workflows',
        'operational_memory',
        'notifications',
        'tasks',
        'dashboards',
        'compliance',
        'telemetry',
        'vendor_intelligence',
        'escalations',
      ].includes(domain);

    const synchronizedDomains = Array.from(new Set([
      ...executive.heatmap.map((cell) => cell.domain),
      ...Object.keys(twinState.domainPressure),
    ])).filter(isFabricDomain);
    const driftScore = clamp(Math.abs(executive.kpis.federatedEventCount - twinState.workflowBacklog) * 0.1);
    return {
      tenantId,
      synchronizedDomains,
      lastSyncAt: new Date().toISOString(),
      driftScore,
    };
  }
}
