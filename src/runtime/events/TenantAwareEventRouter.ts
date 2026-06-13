import { RuntimeEvent } from './types';

type RuntimeEventHandler = (event: RuntimeEvent) => void | Promise<void>;

export class TenantAwareEventRouter {
  private handlers = new Map<string, Set<RuntimeEventHandler>>();

  subscribe(tenantId: string, handler: RuntimeEventHandler): () => void {
    const existing = this.handlers.get(tenantId) || new Set<RuntimeEventHandler>();
    existing.add(handler);
    this.handlers.set(tenantId, existing);
    return () => existing.delete(handler);
  }

  async route(event: RuntimeEvent): Promise<void> {
    const listeners = this.handlers.get(event.tenantId);
    if (!listeners) return;
    for (const handler of listeners) {
      await handler(event);
    }
  }
}

