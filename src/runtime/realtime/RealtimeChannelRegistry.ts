import { RealtimeSubscription } from './types';

export class RealtimeChannelRegistry {
  authorize(subscription: RealtimeSubscription, requiredRoles?: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(subscription.role);
  }
}

