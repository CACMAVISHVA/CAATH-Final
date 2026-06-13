import { OrganizationalSignal } from './types';

export class OrganizationalIntelligenceLayer {
  detectCriticalFriction(signals: OrganizationalSignal[]): OrganizationalSignal[] {
    return signals.filter((signal) => signal.impactScore >= 70 || signal.recurrenceScore >= 70);
  }

  summarizeEfficiency(signals: OrganizationalSignal[]): string {
    if (signals.length === 0) {
      return 'No major organizational inefficiencies detected.';
    }

    const avgImpact = Math.round(
      signals.reduce((acc, signal) => acc + signal.impactScore, 0) / Math.max(signals.length, 1),
    );

    if (avgImpact >= 75) return 'Organization-wide efficiency risk is elevated and requires executive intervention.';
    if (avgImpact >= 50) return 'Efficiency pressure is moderate; targeted optimization can stabilize throughput.';
    return 'Organizational efficiency is generally stable with localized friction.';
  }
}
