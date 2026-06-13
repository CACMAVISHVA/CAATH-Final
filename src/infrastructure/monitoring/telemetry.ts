export type TelemetryEvent = {
  name: string;
  timestamp?: string;
  tags?: Record<string, string>;
  metrics?: Record<string, number>;
};

export const telemetry = {
  track(event: TelemetryEvent) {
    const timestamp = event.timestamp ?? new Date().toISOString();
    window.dispatchEvent(new CustomEvent('caath:telemetry', { detail: { ...event, timestamp } }));
  },
};
