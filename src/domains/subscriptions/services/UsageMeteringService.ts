import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { planPolicyEngine } from '../policies/PlanPolicyEngine';
import { UsageMetric } from '../types';

export class UsageMeteringService {
  constructor(private readonly repository = new SubscriptionRepository()) {}

  async record(metric: UsageMetric) {
    await this.repository.upsertUsage(metric);
  }

  async isWithinLimit(tenantId: string, key: UsageMetric['key'], plan: 'free' | 'premium' | 'enterprise', period: string) {
    const usage = await this.repository.getUsage(tenantId, key, period);
    const limit = planPolicyEngine.getLimit(plan, key);
    const value = usage?.value || 0;
    return value <= limit;
  }
}

export const usageMeteringService = new UsageMeteringService();

