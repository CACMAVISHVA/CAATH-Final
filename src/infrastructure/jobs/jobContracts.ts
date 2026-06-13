export type JobType =
  | 'ai_processing'
  | 'ocr_processing'
  | 'document_indexing'
  | 'gst_processing'
  | 'notification_delivery'
  | 'analytics_aggregation'
  | 'compliance_schedule';

export interface JobEnvelope<TPayload = unknown> {
  id: string;
  tenantId: string;
  type: JobType;
  payload: TPayload;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  correlationId: string;
}

export interface DeadLetterJob {
  job: JobEnvelope;
  reason: string;
  failedAt: string;
}

