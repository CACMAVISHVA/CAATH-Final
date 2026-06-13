import { PlanTier } from '../types';

const PLAN_LIMITS: Record<PlanTier, Record<string, number>> = {
  free: { ai_tokens: 10000, documents_processed: 200, notifications_sent: 500, api_calls: 1000 },
  premium: { ai_tokens: 250000, documents_processed: 5000, notifications_sent: 25000, api_calls: 50000 },
  enterprise: { ai_tokens: 2000000, documents_processed: 50000, notifications_sent: 500000, api_calls: 1000000 },
};

export const planPolicyEngine = {
  getLimit(plan: PlanTier, metricKey: string): number {
    return PLAN_LIMITS[plan][metricKey] ?? 0;
  },
  canAccessFeature(plan: PlanTier, featureKey: string): boolean {
    if (plan === 'enterprise') return true;
    if (plan === 'premium' && featureKey !== 'custom_siem_export') return true;
    return ['dashboard', 'tasks', 'notices', 'clients'].includes(featureKey);
  },
};

