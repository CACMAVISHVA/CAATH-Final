import { NotificationMessage, NotificationPriority } from './types';

const priorityWeights: Record<NotificationPriority, number> = {
  low: 10,
  normal: 20,
  high: 30,
  critical: 40,
};

export class NotificationPriorityManager {
  resolvePriority(input: Pick<NotificationMessage, 'priority' | 'type'>): NotificationPriority {
    if (input.type.includes('security') || input.type.includes('incident')) return 'critical';
    return input.priority;
  }

  compare(a: NotificationPriority, b: NotificationPriority): number {
    return priorityWeights[b] - priorityWeights[a];
  }
}

