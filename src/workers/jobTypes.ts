export type WorkerJobName =
  | 'ai.process_prompt'
  | 'gst.run_automation'
  | 'document.ocr'
  | 'document.index'
  | 'analytics.rebuild_cache';

export type WorkerJob<TPayload = unknown> = {
  id: string;
  name: WorkerJobName;
  payload: TPayload;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
};
