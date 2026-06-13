import { PromptPolicyEngine } from './PromptPolicyEngine';
import { SensitiveDataMaskingRuntime } from './SensitiveDataMaskingRuntime';
import { AIExecutionContext } from './types';

export class AISafetyCoordinator {
  constructor(
    private readonly policy = new PromptPolicyEngine(),
    private readonly masking = new SensitiveDataMaskingRuntime(),
  ) {}

  enforce(prompt: string, context: AIExecutionContext): { allowed: boolean; prompt: string; reason?: string } {
    const decision = this.policy.evaluate(prompt, context);
    if (!decision.allowed) return { allowed: false, prompt: '', reason: decision.reason };
    return { allowed: true, prompt: decision.maskSensitiveData ? this.masking.mask(prompt) : prompt };
  }
}

