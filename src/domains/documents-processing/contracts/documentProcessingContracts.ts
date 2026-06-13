export type DocumentProcessingStage = 'ingested' | 'ocr' | 'indexed' | 'classified' | 'completed' | 'failed';

export interface DocumentProcessingJob {
  id: string;
  tenantId: string;
  documentId: string;
  stage: DocumentProcessingStage;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

