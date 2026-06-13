import { logger } from '../infrastructure/monitoring/logger';
import { DomainEvent, DomainEventName } from './types';

type Handler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

class EventBus {
  private handlers = new Map<DomainEventName, Set<Handler>>();

  subscribe<T>(name: DomainEventName, handler: Handler<T>) {
    const existing = this.handlers.get(name) ?? new Set<Handler>();
    existing.add(handler as Handler);
    this.handlers.set(name, existing);

    return () => {
      const list = this.handlers.get(name);
      list?.delete(handler as Handler);
    };
  }

  async publish<T>(event: DomainEvent<T>) {
    const listeners = this.handlers.get(event.name);
    if (!listeners || listeners.size === 0) return;

    for (const handler of listeners) {
      try {
        await handler(event);
      } catch (error) {
        logger.error('event_handler_failed', { eventName: event.name, error: String(error) });
      }
    }
  }
}

export const eventBus = new EventBus();
