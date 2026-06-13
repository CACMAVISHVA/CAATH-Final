export class CorrelationIdManager {
  create(prefix = 'rt'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

