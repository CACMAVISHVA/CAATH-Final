import { AIUsagePolicy } from '../types';

export const aiUsagePolicies: AIUsagePolicy[] = [
  { key: 'compliance_assistant', requiresApproval: false, maxPromptChars: 10000, maskSensitiveData: true },
  { key: 'document_ai', requiresApproval: true, maxPromptChars: 20000, maskSensitiveData: true },
  { key: 'operational_copilot', requiresApproval: true, maxPromptChars: 12000, maskSensitiveData: true },
];

