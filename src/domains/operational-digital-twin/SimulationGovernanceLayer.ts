import { SimulationScenario } from './types';

export class SimulationGovernanceLayer {
  private readonly blockedKeywords = ['execute', 'trigger_payment', 'send_notification', 'apply_production_change'];

  assertIsolatedScenario(scenario: SimulationScenario): { allowed: boolean; reasons: string[] } {
    const content = `${scenario.name} ${scenario.description} ${JSON.stringify(scenario.context)}`.toLowerCase();
    const violations = this.blockedKeywords.filter((keyword) => content.includes(keyword));
    if (violations.length > 0) {
      return { allowed: false, reasons: [`Scenario includes blocked execution intent: ${violations.join(', ')}`] };
    }
    return { allowed: true, reasons: [] };
  }

  lineageId(scenario: SimulationScenario): string {
    return `sim:${scenario.tenantId}:${scenario.id}:${scenario.type}`;
  }
}
