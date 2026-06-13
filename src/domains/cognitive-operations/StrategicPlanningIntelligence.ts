import { StrategicSimulationScenario } from './types';

export class StrategicPlanningIntelligence {
  prioritizeScenarios(scenarios: StrategicSimulationScenario[]): StrategicSimulationScenario[] {
    return [...scenarios].sort((left, right) => {
      const leftScore = left.expectedEfficiencyDelta + left.expectedSlaDelta - this.investmentPenalty(left.investmentLevel);
      const rightScore = right.expectedEfficiencyDelta + right.expectedSlaDelta - this.investmentPenalty(right.investmentLevel);
      return rightScore - leftScore;
    });
  }

  private investmentPenalty(level: StrategicSimulationScenario['investmentLevel']): number {
    if (level === 'high') return 8;
    if (level === 'medium') return 4;
    return 1;
  }
}
