export class WorkflowRiskScoringEngine {
  score(factors: { escalations: number; failures: number; privilegedActions: number }): number {
    return Math.min(100, factors.escalations * 10 + factors.failures * 15 + factors.privilegedActions * 12);
  }
}

