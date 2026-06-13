export interface SessionSignal {
  sessionId: string;
  tenantId: string;
  impossibleTravel: boolean;
  rapidFailures: boolean;
}

export class SessionIntelligenceEngine {
  evaluate(signal: SessionSignal): number {
    let score = 0;
    if (signal.impossibleTravel) score += 50;
    if (signal.rapidFailures) score += 40;
    return score;
  }
}

