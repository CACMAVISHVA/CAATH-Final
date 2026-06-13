import { TenantSubscription, UsageMetric } from '../types';

export interface ISubscriptionRepository {
  getTenantSubscription(tenantId: string): Promise<TenantSubscription | null>;
  upsertUsage(metric: UsageMetric): Promise<void>;
  getUsage(tenantId: string, key: UsageMetric['key'], period: string): Promise<UsageMetric | null>;
}

export class SubscriptionRepository implements ISubscriptionRepository {
  async getTenantSubscription(_tenantId: string): Promise<TenantSubscription | null> {
    return null;
  }
  async upsertUsage(_metric: UsageMetric): Promise<void> {}
  async getUsage(_tenantId: string, _key: UsageMetric['key'], _period: string): Promise<UsageMetric | null> {
    return null;
  }
}

