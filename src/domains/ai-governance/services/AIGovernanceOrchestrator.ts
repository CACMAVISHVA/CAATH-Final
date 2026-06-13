import { aiUsagePolicies } from '../policies/aiUsagePolicies';
import { aiGovernanceAuditService } from '../audit/aiGovernanceAuditService';
import { maskSensitiveData } from '../masking/sensitiveDataMasker';

export class AIGovernanceOrchestrator {
  async evaluate(params: { tenantId: string; actorId?: string; policyKey: string; prompt: string }) {
    const policy = aiUsagePolicies.find((item) => item.key === params.policyKey);
    if (!policy) {
      return { allowed: false, reason: 'policy_not_found', prompt: '' };
    }

    if (params.prompt.length > policy.maxPromptChars) {
      await aiGovernanceAuditService.log({
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: params.policyKey,
        decision: 'blocked',
        reason: 'prompt_too_large',
      });
      return { allowed: false, reason: 'prompt_too_large', prompt: '' };
    }

    const safePrompt = policy.maskSensitiveData ? maskSensitiveData(params.prompt) : params.prompt;
    const decision = policy.requiresApproval ? 'requires_approval' : 'allowed';
    await aiGovernanceAuditService.log({
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.policyKey,
      decision,
    });
    return { allowed: true, reason: decision, prompt: safePrompt };
  }
}

export const aiGovernanceOrchestrator = new AIGovernanceOrchestrator();

