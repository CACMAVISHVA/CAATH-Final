export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly safeMessage: string;

  constructor(message: string, options?: { code?: string; statusCode?: number; safeMessage?: string }) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code ?? 'APP_ERROR';
    this.statusCode = options?.statusCode ?? 500;
    this.safeMessage = options?.safeMessage ?? 'Something went wrong.';
  }
}

export class SecurityError extends AppError {
  constructor(message: string, safeMessage = 'Security policy blocked this action.') {
    super(message, { code: 'SECURITY_ERROR', statusCode: 403, safeMessage });
    this.name = 'SecurityError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, safeMessage = 'Validation failed for request data.') {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, safeMessage });
    this.name = 'ValidationError';
  }
}

export class TenantIsolationError extends AppError {
  constructor(message: string, safeMessage = 'Tenant boundary validation failed.') {
    super(message, { code: 'TENANT_ISOLATION_ERROR', statusCode: 403, safeMessage });
    this.name = 'TenantIsolationError';
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, safeMessage = 'Infrastructure request failed.') {
    super(message, { code: 'INFRASTRUCTURE_ERROR', statusCode: 502, safeMessage });
    this.name = 'InfrastructureError';
  }
}

export const toSafeError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new InfrastructureError(message);
};
