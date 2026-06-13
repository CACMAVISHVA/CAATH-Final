import { NotificationChannel, NotificationMessage } from './types';

const defaultChannels: NotificationChannel[] = ['in_app'];

export class NotificationRoutingEngine {
  resolveChannels(message: NotificationMessage): NotificationChannel[] {
    if (message.preferredChannels && message.preferredChannels.length > 0) {
      return message.preferredChannels;
    }

    if (message.priority === 'critical') return ['in_app', 'email', 'websocket'];
    if (message.priority === 'high') return ['in_app', 'websocket'];
    return defaultChannels;
  }

  resolveTargets(message: NotificationMessage): NotificationMessage['targets'] {
    const unique = new Map<string, NotificationMessage['targets'][number]>();
    for (const target of message.targets) {
      const key = `${target.userId || '_'}:${target.role || '_'}`;
      unique.set(key, target);
    }
    return [...unique.values()];
  }
}

