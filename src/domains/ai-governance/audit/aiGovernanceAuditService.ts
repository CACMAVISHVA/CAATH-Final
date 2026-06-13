import { logger } from '../../../infrastructure/monitoring/logger';
import { AIAuditEntry } from '../types';

export const aiGovernanceAuditService = {
  async log(entry: Omit<AIAuditEntry, 'id' | 'createdAt'>): Promise<AIAuditEntry> {
    const record: AIAuditEntry = {
      ...entry,
      id: `ai_audit_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    logger.info('ai_governance_audit', { ...record });
    return record;
  },
};
