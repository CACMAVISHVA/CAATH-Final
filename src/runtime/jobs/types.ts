export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface JobEnvelope<TPayload = Record<string, unknown>> {
  id: string;
  tenantId: string;
  type: string;
  payload: TPayload;
  correlationId: string;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
}

export interface DeadLetterEntry {
  job: JobEnvelope;
  reason: string;
  failedAt: string;
}

