import { AIGovernanceRuntime, AIExecutionContext } from '../ai';
import { runtimeAuditService } from './RuntimeAuditService';

export class RuntimeAIService {
  readonly runtime = new AIGovernanceRuntime();

  async authorize(prompt: string, model: string, context: AIExecutionContext): Promise<{ allowed: boolean; prompt: string; reason?: string }> {
    const decision = this.runtime.authorizeAndTrack(prompt, model, context);
    await runtimeAuditService.append({
      tenantId: context.tenantId,
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: decision.allowed ? 'AI_PROMPT_ALLOWED' : 'AI_PROMPT_BLOCKED',
      entityType: 'ai_prompt',
      entityId: context.correlationId,
      details: decision.allowed ? `AI prompt allowed for ${context.workflow}` : `AI prompt blocked: ${decision.reason || 'policy'}`,
      correlationId: context.correlationId,
      severity: decision.allowed ? 'info' : 'warning',
    });
    return decision;
  }
}

export const runtimeAIService = new RuntimeAIService();

