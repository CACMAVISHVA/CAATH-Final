export type RealtimeTransport = 'websocket' | 'broker' | 'supabase_realtime';

export interface RealtimeEnvelope<TPayload = Record<string, unknown>> {
  event: string;
  tenantId: string;
  channel: string;
  roleScope?: string[];
  payload: TPayload;
  correlationId: string;
  occurredAt: string;
}

export interface RealtimeSubscription {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  channel: string;
  transport: RealtimeTransport;
  subscribedAt: string;
}

