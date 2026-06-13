import { AuditRecord } from './types';

export class ImmutableAuditPipeline {
  private records: AuditRecord[] = [];

  append(record: AuditRecord): void {
    this.records = [...this.records, Object.freeze({ ...record })];
  }

  all(): AuditRecord[] {
    return [...this.records];
  }
}

