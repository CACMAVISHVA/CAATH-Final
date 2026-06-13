import { RuntimeConfigurationRegistry } from './RuntimeConfigurationRegistry';

export class RuntimePolicyInjector {
  constructor(private readonly registry: RuntimeConfigurationRegistry) {}

  shouldRun(policyKey: string, tenantId?: string): boolean {
    const toggle = this.registry.getToggle(policyKey);
    if (toggle?.state === 'kill_switch') return false;
    const flag = this.registry.getFlag(policyKey, tenantId);
    return Boolean(flag?.enabled);
  }
}

