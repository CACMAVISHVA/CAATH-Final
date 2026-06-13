import { ComplianceRetentionPolicy } from '../types';

export const complianceRetentionPolicies: ComplianceRetentionPolicy[] = [
  { key: 'security_event', retentionDays: 3650, immutable: true },
  { key: 'workflow_trace', retentionDays: 2555, immutable: true },
  { key: 'ai_decision', retentionDays: 2555, immutable: true },
];

