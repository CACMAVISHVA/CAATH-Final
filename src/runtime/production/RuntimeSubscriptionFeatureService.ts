import { featureFlagService, FeatureName } from '../../services/featureFlagService';
import { usageMeteringService } from '../../domains/subscriptions/services/UsageMeteringService';

type PlanTier = 'caath_practice_os';

export class RuntimeSubscriptionFeatureService {
  isFeatureEnabled(feature: FeatureName, input: { tenantId?: string; plan?: 'CAATH Practice OS' }): boolean {
    return featureFlagService.isEnabled(feature, { tenantId: input.tenantId, plan: input.plan });
  }

  async enforceUsageLimit(input: { tenantId: string; key: 'ai_tokens' | 'documents_processed' | 'notifications_sent' | 'api_calls'; plan: PlanTier; period: string }): Promise<boolean> {
    return usageMeteringService.isWithinLimit(input.tenantId, input.key, input.plan, input.period);
  }
}

export const runtimeSubscriptionFeatureService = new RuntimeSubscriptionFeatureService();

