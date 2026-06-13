import { operationalIntelligenceFabricOrchestrator } from '../operational-fabric';
import { ExecutiveFabricViewModel } from './types';

export class ExecutiveFabricDashboardOrchestrator {
  getViewModel(tenantId: string): ExecutiveFabricViewModel {
    const snapshot = operationalIntelligenceFabricOrchestrator.getExecutiveSnapshot(tenantId);
    return {
      generatedAt: snapshot.generatedAt,
      kpis: snapshot.kpis,
      heatmap: snapshot.heatmap.map((cell) => ({
        domain: cell.domain,
        intensity: cell.intensity,
        status: cell.intensity >= 20 ? 'critical' : cell.intensity >= 10 ? 'watch' : 'stable',
      })),
      summary: snapshot.aiSummary,
      topRiskSignals: snapshot.topRisks.slice(0, 5).map((risk) => risk.signal),
      predictiveInsights: snapshot.predictiveInsights,
    };
  }
}

export const executiveFabricDashboardOrchestrator = new ExecutiveFabricDashboardOrchestrator();
