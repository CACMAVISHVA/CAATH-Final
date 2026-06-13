export interface RuntimeFeatureFlag {
  key: string;
  enabled: boolean;
  tenantId?: string;
  rolloutPercentage?: number;
}

export interface RuntimeToggle {
  key: string;
  state: 'enabled' | 'disabled' | 'kill_switch';
  reason?: string;
  updatedAt: string;
}

