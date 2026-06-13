import { AISafetyCoordinator } from './AISafetyCoordinator';
import { AIUsageTelemetry } from './AIUsageTelemetry';
import { AIExecutionContext } from './types';

export class AIGovernanceRuntime {
  readonly safety = new AISafetyCoordinator();
  readonly telemetry = new AIUsageTelemetry();

  authorizeAndTrack(prompt: string, model: string, context: AIExecutionContext): { allowed: boolean; prompt: string; reason?: string } {
    const decision = this.safety.enforce(prompt, context);
    if (!decision.allowed) return decision;

    this.telemetry.track({
      tenantId: context.tenantId,
      model,
      operation: context.workflow,
      tokenEstimate: Math.ceil(decision.prompt.length / 4),
      correlationId: context.correlationId,
      createdAt: new Date().toISOString(),
    });
    return decision;
  }
}

