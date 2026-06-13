import { OperationalActionTelemetry } from './types';

const storageKey = 'caath:interaction-telemetry';
const maxEvents = 80;

export const readInteractionTelemetry = (): OperationalActionTelemetry[] => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const recordInteractionTelemetry = (event: OperationalActionTelemetry) => {
  try {
    const next = [event, ...readInteractionTelemetry()].slice(0, maxEvents);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Telemetry should never block the operator action path.
  }
};
