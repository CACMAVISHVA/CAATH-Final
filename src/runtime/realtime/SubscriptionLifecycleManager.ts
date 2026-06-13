import { RealtimeSubscription } from './types';

export class SubscriptionLifecycleManager {
  private subscriptions = new Map<string, RealtimeSubscription>();

  register(subscription: RealtimeSubscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  unregister(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  byChannel(tenantId: string, channel: string): RealtimeSubscription[] {
    return [...this.subscriptions.values()].filter((sub) => sub.tenantId === tenantId && sub.channel === channel);
  }
}

