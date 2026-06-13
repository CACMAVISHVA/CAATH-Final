import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { planPolicyEngine } from '../policies/PlanPolicyEngine';

export class FeatureAccessOrchestrator {
  constructor(private readonly repository = new SubscriptionRepository()) {}

  async canAccess(tenantId: string, featureKey: string): Promise<boolean> {
    const subscription = await this.repository.getTenantSubscription(tenantId);
    const plan = subscription?.plan || 'free';
    return planPolicyEngine.canAccessFeature(plan, featureKey);
  }
}

export const featureAccessOrchestrator = new FeatureAccessOrchestrator();

