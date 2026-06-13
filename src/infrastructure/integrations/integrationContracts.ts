export type IntegrationKind = 'webhook' | 'public_api' | 'gst' | 'mca' | 'banking' | 'partner';

export interface IntegrationRequest {
  tenantId: string;
  kind: IntegrationKind;
  operation: string;
  payload: Record<string, unknown>;
  correlationId: string;
}

export interface WebhookEventContract {
  event: string;
  tenantId: string;
  version: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

