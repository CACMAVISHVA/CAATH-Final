export interface RuntimeEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  version: number;
  tenantId: string;
  payload: TPayload;
  correlationId: string;
  occurredAt: string;
}

