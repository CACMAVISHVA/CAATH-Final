export type AIPolicy = {
  id: string;
  description: string;
  enforce: (input: string) => { allowed: boolean; reason?: string };
};

const blockPiiLeakage: AIPolicy = {
  id: 'policy.block-pii-leakage',
  description: 'Prevents prompts that explicitly request sensitive personal identifiers.',
  enforce: (input: string) => {
    const riskyTokens = ['aadhaar', 'pan number', 'password', 'otp'];
    const found = riskyTokens.some((token) => input.toLowerCase().includes(token));
    return found ? { allowed: false, reason: 'Prompt contains restricted sensitive data markers.' } : { allowed: true };
  },
};

export const aiPolicyRegistry = [blockPiiLeakage];
