import { SecurityEventType } from './securityEventTypes';

const anomalyCounters = new Map<string, number>();

export const recordAnomalySignal = (type: SecurityEventType, actorId?: string): number => {
  const key = `${type}:${actorId || 'anonymous'}`;
  const next = (anomalyCounters.get(key) || 0) + 1;
  anomalyCounters.set(key, next);
  return next;
};

export const clearAnomalySignal = (type: SecurityEventType, actorId?: string): void => {
  anomalyCounters.delete(`${type}:${actorId || 'anonymous'}`);
};
