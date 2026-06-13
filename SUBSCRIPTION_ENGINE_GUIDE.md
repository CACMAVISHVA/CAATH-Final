# Subscription Engine Guide

## Foundation
- Repository: `src/domains/subscriptions/repositories/SubscriptionRepository.ts`
- Plan policy: `src/domains/subscriptions/policies/PlanPolicyEngine.ts`
- Usage metering: `src/domains/subscriptions/services/UsageMeteringService.ts`
- Feature access: `src/domains/subscriptions/services/FeatureAccessOrchestrator.ts`

## Key Principles
- No hardcoded plan checks in UI/components.
- Central policy enforcement for feature and quota logic.
- Meter usage by tenant and period.

## Monetization Readiness
- Free/premium/enterprise tiers.
- AI token and API usage quotas.
- Threshold-triggered events for upsell/compliance workflows.
