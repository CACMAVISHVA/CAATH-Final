export interface ComplianceAuditRecord {
  id: string;
  tenantId: string;
  eventType: string;
  actorId?: string;
  actorRole?: string;
  details: Record<string, unknown>;
  hash?: string;
  createdAt: string;
}

export interface ComplianceRetentionPolicy {
  key: string;
  retentionDays: number;
  immutable: boolean;
}

