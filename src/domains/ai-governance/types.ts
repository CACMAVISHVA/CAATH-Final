export interface AIUsagePolicy {
  key: string;
  requiresApproval: boolean;
  maxPromptChars: number;
  maskSensitiveData: boolean;
}

export interface AIAuditEntry {
  id: string;
  tenantId: string;
  actorId?: string;
  action: string;
  promptHash?: string;
  decision: 'allowed' | 'blocked' | 'requires_approval';
  reason?: string;
  createdAt: string;
}

