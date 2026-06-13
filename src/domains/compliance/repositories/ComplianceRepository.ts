import { ComplianceAuditRecord } from '../types';

export interface IComplianceRepository {
  appendAudit(record: ComplianceAuditRecord): Promise<void>;
  listAudits(tenantId: string, limit?: number): Promise<ComplianceAuditRecord[]>;
}

export class ComplianceRepository implements IComplianceRepository {
  async appendAudit(_record: ComplianceAuditRecord): Promise<void> {}
  async listAudits(_tenantId: string, _limit = 100): Promise<ComplianceAuditRecord[]> {
    return [];
  }
}

