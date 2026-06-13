import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { logger } from '../../infrastructure/monitoring/logger';

type NotificationChangeHandler = () => void | Promise<void>;

export class SupabaseRealtimeRuntime {
  private channels = new Map<string, RealtimeChannel>();

  subscribeNotifications(
    key: string,
    params: { userId: string; firmId?: string; role?: string },
    onChanged: NotificationChangeHandler,
  ): () => void {
    const channel = supabase
      .channel(`runtime:notifications:${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        async () => {
          await onChanged();
        },
      )
      .subscribe((status) => {
        logger.info('runtime_realtime_subscription_status', { channel: `runtime:notifications:${key}`, status });
      });

    this.channels.set(key, channel);

    return () => this.unsubscribe(key);
  }

  unsubscribe(key: string): void {
    const channel = this.channels.get(key);
    if (!channel) return;
    supabase.removeChannel(channel);
    this.channels.delete(key);
  }

  shutdown(): void {
    for (const [key] of this.channels) {
      this.unsubscribe(key);
    }
  }
}
