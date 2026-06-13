export interface WorkflowExecutionContext {
  tenantId: string;
  actorId?: string;
  traceId?: string;
  triggeredAt: string;
}

export interface WorkflowOrchestrator<TInput, TResult> {
  execute(input: TInput, context: WorkflowExecutionContext): Promise<TResult>;
}

export interface WorkflowJobContract<TPayload = unknown> {
  jobType: string;
  payload: TPayload;
  retryable: boolean;
  maxAttempts: number;
}
