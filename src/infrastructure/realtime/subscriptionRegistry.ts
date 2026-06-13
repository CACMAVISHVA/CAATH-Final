import { RealtimeSubscription } from './realtimeContracts';

export class RealtimeSubscriptionRegistry {
  private subscriptions = new Map<string, RealtimeSubscription[]>();

  add(subscription: RealtimeSubscription) {
    const key = `${subscription.tenantId}:${subscription.channel}`;
    const existing = this.subscriptions.get(key) || [];
    this.subscriptions.set(key, [...existing, subscription]);
  }

  list(tenantId: string, channel: string): RealtimeSubscription[] {
    return this.subscriptions.get(`${tenantId}:${channel}`) || [];
  }
}

export const realtimeSubscriptionRegistry = new RealtimeSubscriptionRegistry();

