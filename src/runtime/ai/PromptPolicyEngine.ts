import { AIExecutionContext, PromptPolicyDecision } from './types';

const restrictedRoles = new Set(['Staff']);

export class PromptPolicyEngine {
  evaluate(prompt: string, context: AIExecutionContext): PromptPolicyDecision {
    if (restrictedRoles.has(context.actorRole) && prompt.toLowerCase().includes('export all')) {
      return { allowed: false, reason: 'role_restriction', maskSensitiveData: true };
    }
    return { allowed: true, maskSensitiveData: true };
  }
}

