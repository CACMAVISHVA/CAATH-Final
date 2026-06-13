import { RuntimeFeatureFlag, RuntimeToggle } from './types';

export class RuntimeConfigurationRegistry {
  private flags = new Map<string, RuntimeFeatureFlag>();
  private toggles = new Map<string, RuntimeToggle>();

  setFlag(flag: RuntimeFeatureFlag): void {
    this.flags.set(`${flag.tenantId || 'global'}:${flag.key}`, flag);
  }

  getFlag(key: string, tenantId?: string): RuntimeFeatureFlag | undefined {
    return this.flags.get(`${tenantId || 'global'}:${key}`) || this.flags.get(`global:${key}`);
  }

  setToggle(toggle: RuntimeToggle): void {
    this.toggles.set(toggle.key, toggle);
  }

  getToggle(key: string): RuntimeToggle | undefined {
    return this.toggles.get(key);
  }
}

