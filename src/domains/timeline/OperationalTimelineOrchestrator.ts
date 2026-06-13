import { User } from '../../types';
import { getEnterpriseAuditLogs } from '../../services/auditLogService';
import { collaborationOrchestrator } from '../collaboration';

export class OperationalTimelineOrchestrator {
  async getUnifiedTimeline(user: User, limit = 50) {
    const [collaboration, audit] = await Promise.all([
      collaborationOrchestrator.timeline(user, limit),
      getEnterpriseAuditLogs({ firmId: user.firmId, limit, includePortal: true }),
    ]);

    const auditItems = audit.map((item) => ({
      id: `audit_${item.id}`,
      type: 'audit' as const,
      timestamp: item.created_at,
      title: item.action,
      description: item.details,
      severity: item.severity || 'info',
    }));

    const collabItems = collaboration.items.map((item) => ({
      id: `activity_${item.id}`,
      type: 'activity' as const,
      timestamp: item.created_at,
      title: item.event_type,
      description: JSON.stringify(item.details || {}),
      severity: item.severity || 'info',
    }));

    return [...auditItems, ...collabItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const operationalTimelineOrchestrator = new OperationalTimelineOrchestrator();

