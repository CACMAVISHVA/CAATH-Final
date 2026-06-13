import { AuditRecord } from './types';

export class AuditCorrelationEngine {
  link(records: AuditRecord[], correlationId: string): AuditRecord[] {
    return records.filter((record) => record.correlationId === correlationId);
  }
}

