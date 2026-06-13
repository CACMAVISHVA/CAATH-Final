import { RealtimeSubscription } from './realtimeContracts';

export const tenantChannelPolicy = {
  canSubscribe(subscription: RealtimeSubscription): boolean {
    if (!subscription.tenantId || !subscription.userId) return false;
    if (subscription.role === 'Client' && subscription.channel.startsWith('admin:')) return false;
    return true;
  },
};

