import { OperationalHeatmapCell } from './types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export class OperationalHeatmapEngine {
  build(input: {
    zones: string[];
    queueDepth: number;
    escalations: number;
    workloadImbalance: number;
  }): OperationalHeatmapCell[] {
    return input.zones.map((zone, index) => {
      const offset = (index + 1) * 3;
      const queueCongestion = clamp(input.queueDepth * 0.5 + offset);
      const escalationDensity = clamp(input.escalations * 0.8 + offset);
      const imbalance = clamp(input.workloadImbalance + offset);
      const pressure = clamp((queueCongestion * 0.4) + (escalationDensity * 0.3) + (imbalance * 0.3));
      return {
        zone,
        pressure,
        queueCongestion,
        escalationDensity,
        workloadImbalance: imbalance,
      };
    });
  }
}
