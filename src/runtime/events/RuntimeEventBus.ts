import { EventCorrelationManager } from './EventCorrelationManager';
import { EventLifecycleCoordinator } from './EventLifecycleCoordinator';
import { EventReplayFoundation } from './EventReplayFoundation';
import { TenantAwareEventRouter } from './TenantAwareEventRouter';
import { RuntimeEvent } from './types';

type RuntimeEventListener = (event: RuntimeEvent) => void | Promise<void>;

export class RuntimeEventBus {
  private events: RuntimeEvent[] = [];
  private listeners = new Set<RuntimeEventListener>();
  readonly correlation = new EventCorrelationManager();
  readonly replay = new EventReplayFoundation();
  readonly lifecycle = new EventLifecycleCoordinator();
  readonly router = new TenantAwareEventRouter();

  async publish(event: RuntimeEvent): Promise<void> {
    if (!this.lifecycle.validate(event)) return;
    this.events.push(event);
    await this.router.route(event);
    for (const listener of this.listeners) {
      await listener(event);
    }
  }

  list(): RuntimeEvent[] {
    return [...this.events];
  }

  subscribe(listener: RuntimeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
