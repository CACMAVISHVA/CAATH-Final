import { NotificationRecord } from '../types';

export interface NotificationPolicyContext {
  tenantId: string;
  actorRole: string;
  notificationType: string;
  priority: NotificationRecord['priority'];
}

export const notificationPolicyEngine = {
  resolveChannel(context: NotificationPolicyContext): NotificationRecord['channel'] {
    if (context.priority === 'critical') return 'websocket';
    if (context.notificationType.includes('compliance')) return 'email';
    return 'in_app';
  },
  shouldEscalate(context: NotificationPolicyContext): boolean {
    return context.priority === 'critical' || context.actorRole === 'SuperAdmin';
  },
};

