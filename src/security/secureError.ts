export type SecurityErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'TENANT_REQUIRED'
  | 'TENANT_FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export class SecurityAppError extends Error {
  code: SecurityErrorCode;
  status: number;
  safeMessage: string;

  constructor(message: string, code: SecurityErrorCode, status = 400, safeMessage?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.safeMessage = safeMessage || message;
  }
}

export const toSafeError = (error: unknown): SecurityAppError => {
  if (error instanceof SecurityAppError) return error;
  return new SecurityAppError('Operation failed.', 'UNKNOWN_ERROR', 500, 'Something went wrong. Please try again.');
};
