import { RealtimeChannelRegistry } from './RealtimeChannelRegistry';
import { SubscriptionLifecycleManager } from './SubscriptionLifecycleManager';
import { RealtimeEnvelope, RealtimeSubscription } from './types';

export class RealtimeRuntimeCoordinator {
  constructor(
    private readonly lifecycle = new SubscriptionLifecycleManager(),
    private readonly registry = new RealtimeChannelRegistry(),
  ) {}

  subscribe(subscription: RealtimeSubscription): void {
    this.lifecycle.register(subscription);
  }

  unsubscribe(subscriptionId: string): void {
    this.lifecycle.unregister(subscriptionId);
  }

  resolveRecipients(envelope: RealtimeEnvelope): RealtimeSubscription[] {
    const candidates = this.lifecycle.byChannel(envelope.tenantId, envelope.channel);
    return candidates.filter((sub) => this.registry.authorize(sub, envelope.roleScope));
  }
}

