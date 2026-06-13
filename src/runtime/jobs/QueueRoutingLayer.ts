import { JobEnvelope } from './types';

const queueByType: Record<string, string> = {
  ai_processing: 'ai',
  ocr_processing: 'documents',
  notification_delivery: 'notifications',
  analytics_aggregation: 'analytics',
  compliance_check: 'compliance',
};

export class QueueRoutingLayer {
  resolveQueue(job: JobEnvelope): string {
    return queueByType[job.type] || 'default';
  }
}

