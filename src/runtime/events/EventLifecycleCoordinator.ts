import { RuntimeEvent } from './types';

export class EventLifecycleCoordinator {
  validate(event: RuntimeEvent): boolean {
    return Boolean(event.id && event.name && event.tenantId && event.correlationId);
  }
}

