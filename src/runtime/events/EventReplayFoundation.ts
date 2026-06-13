import { RuntimeEvent } from './types';

export class EventReplayFoundation {
  replay(events: RuntimeEvent[], fromIso?: string): RuntimeEvent[] {
    return events
      .filter((event) => !fromIso || event.occurredAt >= fromIso)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }
}

