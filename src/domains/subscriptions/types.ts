export type PlanTier = 'caath_practice_os';

export interface TenantSubscription {
  tenantId: string;
  plan: PlanTier;
  status: 'active' | 'trial' | 'past_due' | 'canceled';
  renewsAt?: string;
}

export interface UsageMetric {
  tenantId: string;
  key: 'ai_tokens' | 'documents_processed' | 'notifications_sent' | 'api_calls';
  value: number;
  period: string;
}

