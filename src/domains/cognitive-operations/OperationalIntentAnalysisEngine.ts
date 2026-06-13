import { OperationalIntentSignal } from './types';

export class OperationalIntentAnalysisEngine {
  inferDominantIntent(signals: OperationalIntentSignal[]): string {
    if (signals.length === 0) return 'No intent signal available.';

    const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);
    const top = sorted[0];
    return `${top.inferredIntent} (${Math.round(top.confidence * 100)}% confidence)`;
  }

  detectIntentDrift(signals: OperationalIntentSignal[]): OperationalIntentSignal[] {
    return signals.filter((signal) => signal.confidence < 0.65 || signal.objectiveLinks.length === 0);
  }
}
