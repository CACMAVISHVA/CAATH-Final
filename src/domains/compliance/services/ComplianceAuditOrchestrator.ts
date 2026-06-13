import { ComplianceRepository } from '../repositories/ComplianceRepository';
import { ComplianceAuditRecord } from '../types';

export class ComplianceAuditOrchestrator {
  constructor(private readonly repository = new ComplianceRepository()) {}

  async append(record: Omit<ComplianceAuditRecord, 'id' | 'createdAt'>) {
    const audit: ComplianceAuditRecord = {
      ...record,
      id: `audit_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await this.repository.appendAudit(audit);
    return audit;
  }
}

export const complianceAuditOrchestrator = new ComplianceAuditOrchestrator();

