import { AuditRecord } from './types';

export class WorkflowTraceHistory {
  constructor(private readonly source: () => AuditRecord[]) {}

  replay(correlationId: string): AuditRecord[] {
    return this.source().filter((record) => record.correlationId === correlationId);
  }
}

