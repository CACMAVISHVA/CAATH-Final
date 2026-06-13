import { RuntimeEvent } from './types';

export class EventCorrelationManager {
  byCorrelation(events: RuntimeEvent[], correlationId: string): RuntimeEvent[] {
    return events.filter((event) => event.correlationId === correlationId);
  }
}

