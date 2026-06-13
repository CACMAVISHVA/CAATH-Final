export interface AIExecutionContext {
  tenantId: string;
  actorId: string;
  actorRole: string;
  workflow: string;
  correlationId: string;
}

export interface PromptPolicyDecision {
  allowed: boolean;
  reason?: string;
  maskSensitiveData: boolean;
}

export interface AIUsageEvent {
  tenantId: string;
  model: string;
  operation: string;
  tokenEstimate: number;
  correlationId: string;
  createdAt: string;
}

