export interface AuditRecord<TPayload = Record<string, unknown>> {
  id: string;
  tenantId: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: TPayload;
  correlationId: string;
  occurredAt: string;
}

export interface AuditRetentionRule {
  category: string;
  retentionDays: number;
  immutable: true;
}

