export type RealtimeEventName =
  | 'WORKFLOW_UPDATED'
  | 'NOTIFICATION_RECEIVED'
  | 'ACTIVITY_FEED_APPENDED'
  | 'METRIC_STREAM_UPDATED';

export interface RealtimeEnvelope<TPayload = unknown> {
  event: RealtimeEventName;
  tenantId: string;
  roleScope?: string[];
  channel: string;
  payload: TPayload;
  correlationId: string;
  occurredAt: string;
}

export interface RealtimeSubscription {
  tenantId: string;
  userId: string;
  role: string;
  channel: string;
}

