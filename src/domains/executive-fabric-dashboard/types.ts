import { ExecutiveOperationalSnapshot } from '../operational-fabric';

export interface ExecutiveHeatmapCell {
  domain: string;
  intensity: number;
  status: 'stable' | 'watch' | 'critical';
}

export interface ExecutiveFabricViewModel {
  generatedAt: string;
  kpis: Record<string, number>;
  heatmap: ExecutiveHeatmapCell[];
  summary: string;
  topRiskSignals: string[];
  predictiveInsights: string[];
}

export interface ExecutiveFabricDashboardInput {
  tenantId: string;
  snapshot: ExecutiveOperationalSnapshot;
}
