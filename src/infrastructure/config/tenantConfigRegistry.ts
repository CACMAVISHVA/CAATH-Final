export interface TenantRuntimeConfig {
  tenantId: string;
  featureFlags: Record<string, boolean>;
  toggles: Record<string, string | number | boolean>;
}

class TenantConfigRegistry {
  private registry = new Map<string, TenantRuntimeConfig>();

  upsert(config: TenantRuntimeConfig) {
    this.registry.set(config.tenantId, config);
  }

  get(tenantId: string): TenantRuntimeConfig | null {
    return this.registry.get(tenantId) || null;
  }
}

export const tenantConfigRegistry = new TenantConfigRegistry();

