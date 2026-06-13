import { User } from '../../types';
import { createReminder } from '../../services/automationService';
import { runtimeNotificationService, runtimeQueueService } from '../../runtime/production';
import { AutomationRule } from './types';

export class AutomationRulesEngine {
  private rules: AutomationRule[] = [
    { id: 'rule_overdue_escalation', name: 'Overdue Escalation', eventType: 'task_overdue', condition: 'age>48h', action: 'escalate', enabled: true },
    { id: 'rule_compliance_deadline', name: 'Compliance Deadline Alert', eventType: 'compliance_deadline', condition: 'due<24h', action: 'notify', enabled: true },
    { id: 'rule_auto_assignment', name: 'Auto Assignment Hint', eventType: 'workload_imbalance', condition: 'load>8', action: 'assign', enabled: true },
  ];

  list(): AutomationRule[] {
    return [...this.rules];
  }

  async execute(eventType: string, payload: Record<string, unknown>, actor: User): Promise<void> {
    const active = this.rules.filter((rule) => rule.enabled && rule.eventType === eventType);
    for (const rule of active) {
      if (rule.action === 'notify' && actor.firmId) {
        await runtimeNotificationService.dispatch({
          id: `rule_notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          tenantId: actor.firmId,
          type: `automation.${rule.id}`,
          title: rule.name,
          body: String(payload.message || 'Automation alert triggered'),
          targets: [{ role: 'Admin' }],
          priority: 'high',
          correlationId: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          triggeredBy: actor.id,
          triggeredAt: new Date().toISOString(),
        });
      }

      if (rule.action === 'queue_job' && actor.firmId) {
        runtimeQueueService.enqueue({
          id: `job_auto_${rule.id}_${Date.now()}`,
          tenantId: actor.firmId,
          type: 'analytics_aggregation',
          payload,
          correlationId: `auto_${Date.now()}`,
          priority: 'normal',
          attempts: 0,
          maxAttempts: 3,
          scheduledAt: new Date().toISOString(),
        });
      }

      if (rule.action === 'escalate' && actor.firmId) {
        await createReminder({
          firmId: actor.firmId,
          userId: actor.id,
          reminderType: 'NOTICE_DEADLINE',
          title: `Escalation: ${rule.name}`,
          message: String(payload.message || 'Escalation rule triggered'),
          triggerAt: new Date().toISOString(),
          frequency: 'ONCE',
        });
      }
    }
  }
}

export const automationRulesEngine = new AutomationRulesEngine();

