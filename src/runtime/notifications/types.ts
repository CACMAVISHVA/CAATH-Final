export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'websocket';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationTarget {
  userId?: string;
  role?: string;
}

export interface NotificationMessage<TPayload = Record<string, unknown>> {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  payload?: TPayload;
  targets: NotificationTarget[];
  preferredChannels?: NotificationChannel[];
  priority: NotificationPriority;
  correlationId: string;
  triggeredBy?: string;
  triggeredAt: string;
}

export interface NotificationDeliveryTask {
  notification: NotificationMessage;
  channel: NotificationChannel;
  attempt: number;
  maxAttempts: number;
  deliverAfter?: string;
}

export interface NotificationDeliveryResult {
  delivered: boolean;
  providerMessageId?: string;
  reason?: string;
  retryable?: boolean;
}

export interface NotificationEscalationRule {
  eventType: string;
  minimumPriority: NotificationPriority;
  escalationRoles: string[];
}

