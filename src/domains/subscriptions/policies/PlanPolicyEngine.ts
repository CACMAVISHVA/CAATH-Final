import { PlanTier } from '../types';

const PLAN_LIMITS: Record<PlanTier, Record<string, number>> = {
  caath_practice_os: { ai_tokens: 2000000, documents_processed: 50000, notifications_sent: 500000, api_calls: 1000000 },
};

export const planPolicyEngine = {
  getLimit(plan: PlanTier, metricKey: string): number {
    return PLAN_LIMITS[plan][metricKey] ?? 0;
  },
  canAccessFeature(plan: PlanTier, featureKey: string): boolean {
    return true;
  },
};

