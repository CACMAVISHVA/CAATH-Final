import { AuditRetentionRule } from './types';

export class ComplianceRetentionPolicies {
  private readonly rules: AuditRetentionRule[] = [
    { category: 'security', retentionDays: 3650, immutable: true },
    { category: 'financial', retentionDays: 2555, immutable: true },
    { category: 'operations', retentionDays: 1095, immutable: true },
  ];

  resolve(category: string): AuditRetentionRule {
    return this.rules.find((rule) => rule.category === category) || { category, retentionDays: 365, immutable: true };
  }
}

