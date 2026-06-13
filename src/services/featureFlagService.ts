export type FeatureName =
  | 'ai-workflows'
  | 'gst-automation'
  | 'advanced-audit'
  | 'beta-mobile-api'
  | 'document-ocr';

export type FeatureContext = {
  tenantId?: string;
  plan?: 'Basic' | 'Pro' | 'Enterprise';
  tenantOverrides?: Partial<Record<FeatureName, boolean>>;
  adminOverrides?: Partial<Record<FeatureName, boolean>>;
};

const planDefaults: Record<NonNullable<FeatureContext['plan']>, Partial<Record<FeatureName, boolean>>> = {
  Basic: { 'ai-workflows': false, 'gst-automation': false, 'advanced-audit': false, 'beta-mobile-api': false, 'document-ocr': false },
  Pro: { 'ai-workflows': true, 'gst-automation': true, 'advanced-audit': false, 'beta-mobile-api': false, 'document-ocr': true },
  Enterprise: { 'ai-workflows': true, 'gst-automation': true, 'advanced-audit': true, 'beta-mobile-api': true, 'document-ocr': true },
};

export const featureFlagService = {
  isEnabled(feature: FeatureName, context: FeatureContext): boolean {
    if (context.adminOverrides?.[feature] !== undefined) return Boolean(context.adminOverrides[feature]);
    if (context.tenantOverrides?.[feature] !== undefined) return Boolean(context.tenantOverrides[feature]);
    const plan = context.plan ?? 'Basic';
    return Boolean(planDefaults[plan][feature]);
  },
};
